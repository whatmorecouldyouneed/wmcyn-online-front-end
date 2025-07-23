import React from 'react';
import styles from './LiquidGlassEffect.module.scss';

interface LiquidGlassEffectProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'button' | 'menu' | 'dock';
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const LiquidGlassEffect: React.FC<LiquidGlassEffectProps> = ({
  children,
  className = '',
  variant = 'button',
  onClick,
}) => {
  return (
    <div
      className={[
        styles['liquidGlass-wrapper'],
        styles[variant],
        className
      ].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <div className={styles['liquidGlass-effect']} />
      <div className={styles['liquidGlass-tint']} />
      <div className={styles['liquidGlass-shine']} />
      <div className={styles['liquidGlass-text']}>
        {children}
      </div>
    </div>
  );
};

export default LiquidGlassEffect; 