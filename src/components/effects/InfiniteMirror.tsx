'use client';

import React, { useEffect, useState, useCallback, memo, useRef } from 'react';
import Typewriter from 'typewriter-effect';
import NextImage from '../NextImage';
import { db, ref, push, set } from '../../utils/lib/firebase';
import styles from './InfiniteMirror.module.scss';
import glassStyles from './LiquidGlassForm.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

interface InfiniteMirrorProps {
  depth?: number;
  className?: string;
}

// GPU-optimized WebGL droste effect component
const WebGLDrosteEffect = memo<{ isPaused: boolean }>(({ isPaused }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!context || !(context instanceof WebGLRenderingContext)) {
      console.warn('WebGL not supported, falling back to CSS animation');
      return;
    }

    const gl = context as WebGLRenderingContext;
    glRef.current = gl;

    // Vertex shader
    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = (a_position + 1.0) * 0.5;
      }
    `;

    // Fragment shader for droste effect
    const fragmentShaderSource = `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;
      
      vec2 complex_mult(vec2 a, vec2 b) {
        return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
      }
      
      vec2 complex_log(vec2 z) {
        return vec2(log(length(z)), atan(z.y, z.x));
      }
      
      float smoothBorder(vec2 uv, float thickness) {
        vec2 border = abs(uv - 0.5) - 0.5 + thickness;
        float dist = length(max(border, 0.0)) + min(max(border.x, border.y), 0.0) - thickness;
        return 1.0 - smoothstep(-0.02, 0.02, dist);
      }
      
      void main() {
        vec2 uv = v_texCoord;
        vec2 center = vec2(0.5, 0.5);
        vec2 pos = uv - center;
        
        // Create the droste transformation
        float scale = 0.85;
        float rotation = u_time * 0.3;
        
        // Apply rotation
        float cos_r = cos(rotation);
        float sin_r = sin(rotation);
        pos = vec2(pos.x * cos_r - pos.y * sin_r, pos.x * sin_r + pos.y * cos_r);
        
        // Convert to polar coordinates for the infinite zoom
        float r = length(pos);
        float a = atan(pos.y, pos.x);
        
        // Create the infinite zoom effect
        float zoom = exp(-u_time * 0.8);
        r = mod(r * zoom, 1.0 / scale) * scale;
        
        // Convert back to cartesian
        pos = r * vec2(cos(a), sin(a));
        uv = pos + center;
        
        // Create multiple depth layers
        float depth1 = smoothBorder(uv, 0.1);
        float depth2 = smoothBorder(uv * 1.2 - 0.1, 0.08);
        float depth3 = smoothBorder(uv * 1.5 - 0.25, 0.06);
        
        // Combine layers with different intensities
        float intensity = depth1 * 0.9 + depth2 * 0.6 + depth3 * 0.3;
        
        // Add subtle color variation
        vec3 color = vec3(1.0, 1.0, 1.0) * intensity;
        color.rgb += vec3(0.05, 0.1, 0.15) * sin(u_time + r * 10.0);
        
        // Add depth-based opacity
        float opacity = 0.15 + intensity * 0.25;
        
        gl_FragColor = vec4(color, opacity);
      }
    `;

    function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
      const shader = gl.createShader(type);
      if (!shader) return null;
      
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      
      return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return;
    }
    
    programRef.current = program;

    // Set up geometry (full-screen quad)
    const positions = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const timeUniformLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');

    function resize() {
      if (!canvas || !gl) return;
      
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
      }
    }

    function render() {
      if (!gl || !program || !canvas || isPaused) {
        if (!isPaused) {
          animationRef.current = requestAnimationFrame(render);
        }
        return;
      }

      resize();

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      // Set uniforms
      const time = (Date.now() - startTimeRef.current) * 0.001;
      gl.uniform1f(timeUniformLocation, time);
      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

      // Set up attributes
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      // Enable blending for transparency
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Draw
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationRef.current = requestAnimationFrame(render);
    }

    // Set clear color (transparent)
    gl.clearColor(0, 0, 0, 0);
    
    // Start render loop
    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused]);

  useEffect(() => {
    if (isPaused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      const render = () => {
        if (!glRef.current || !programRef.current || isPaused) {
          if (!isPaused) {
            animationRef.current = requestAnimationFrame(render);
          }
          return;
        }
        // Render logic is in the main useEffect
        animationRef.current = requestAnimationFrame(render);
      };
      render();
    }
  }, [isPaused]);

  return (
    <canvas 
      ref={canvasRef}
      className={styles.webglCanvas}
    />
  );
});

WebGLDrosteEffect.displayName = 'WebGLDrosteEffect';

function writeUserData(emailID: string) {
  if (!db) {
    console.error('Firebase database not initialized');
    return Promise.reject(new Error('Firebase not initialized'));
  }
  
  const emailListRef = ref(db, 'emailList');
  const newEmailRef = push(emailListRef);
  const emailData = { 
    email: emailID,
    timestamp: Date.now(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
  };
  
  return set(newEmailRef, emailData).catch((error) => {
    console.error('Firebase write failed:', error);
    throw error;
  });
}

// Main content component (simplified)
const ContentLayer = memo<{ 
  hasSubscribed: boolean; 
  email: string; 
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  onEmailChange: (value: string) => void;
}>(({ hasSubscribed, email, error, onSubmit, onEmailChange }) => {
  return (
    <div className={styles.mainContent}>
      <NextImage 
        src={WMCYNLOGO} 
        alt="WMCYN Logo" 
        className={styles.logo}
        priority
      />
      
      <h1 className={styles.typewriter}>
        {hasSubscribed ? (
          <Typewriter 
            options={{ 
              strings: ['WMCYN WELCOMES YOU'], 
              autoStart: true, 
              loop: true 
            }} 
          />
        ) : (
          <Typewriter
            options={{
              strings: ["YOU'RE EARLY...", 'SIGN UP FOR OUR NEWSLETTER'],
              autoStart: true,
              loop: true,
            }}
          />
        )}
      </h1>

      {!hasSubscribed && (
        <div className={glassStyles.liquidGlassFormContainer}>
          <div className={glassStyles.liquidGlassFilter}></div>
          <div className={glassStyles.liquidGlassOverlay}></div>
          <div className={glassStyles.liquidGlassSpecular}></div>
          <div className={glassStyles.liquidGlassContent}>
            <form onSubmit={onSubmit} className={glassStyles.liquidGlassForm}>
              <input
                type="email"
                placeholder="enter your email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className={glassStyles.inputField}
                required
              />
              <button type="submit" className={glassStyles.submitButton}>
                subscribe
              </button>
            </form>
            {error && (
              <p className={glassStyles.error}>{error}</p>
            )}
          </div>
        </div>
      )}

      {hasSubscribed && (
        <div className={glassStyles.liquidGlassFormContainer}>
          <div className={glassStyles.liquidGlassFilter}></div>
          <div className={glassStyles.liquidGlassOverlay}></div>
          <div className={glassStyles.liquidGlassSpecular}></div>
          <div className={glassStyles.liquidGlassContent}>
            <p className={glassStyles.subscribedText}>subscribed.</p>
          </div>
        </div>
      )}
    </div>
  );
});

ContentLayer.displayName = 'ContentLayer';

const InfiniteMirror: React.FC<InfiniteMirrorProps> = ({ className }) => {
  const [mounted, setMounted] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [email, setEmail] = useState('');
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    // Check if user has already subscribed
    const storedEmails = JSON.parse(localStorage.getItem('wmcyn-emails') || '[]');
    if (storedEmails.length > 0) {
      setHasSubscribed(true);
    }
  }, []);

  const handleContainerClick = useCallback(() => {
    setIsInteractive(!isInteractive);
  }, [isInteractive]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setError('');
    try {
      await writeUserData(email);
      
      const existingEmails = JSON.parse(localStorage.getItem('wmcyn-emails') || '[]');
      if (!existingEmails.includes(email)) {
        existingEmails.push(email);
      }
      localStorage.setItem('wmcyn-emails', JSON.stringify(existingEmails));
      
      setHasSubscribed(true);
      setEmail('');
    } catch (err) {
      setError('Failed to subscribe. Please try again.');
      console.error('Subscription error:', err);
    }
  }, [email]);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
  }, []);

  if (!mounted) return null;

  return (
    <div 
      className={`${styles.infiniteContainer} ${className || ''} ${isInteractive ? styles.paused : ''}`}
      onClick={handleContainerClick}
    >
      {/* GPU-optimized WebGL droste effect */}
      <WebGLDrosteEffect isPaused={isInteractive} />
      
      {/* Content overlay */}
      <div className={styles.contentOverlay}>
        <ContentLayer
          hasSubscribed={hasSubscribed}
          email={email}
          error={error}
          onSubmit={handleSubmit}
          onEmailChange={handleEmailChange}
        />
      </div>
      
      {/* Click hint */}
      {!isInteractive && (
        <div className={styles.clickHint}>
          click to pause the infinite
        </div>
      )}
    </div>
  );
};

export default memo(InfiniteMirror); 