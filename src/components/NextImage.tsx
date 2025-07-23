import { forwardRef } from 'react';

interface NextImageProps {
  src: string | any;
  alt: string;
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  [key: string]: any;
}

const NextImage = forwardRef<HTMLImageElement, NextImageProps>((props, ref) => {
  const isProd = process.env.NODE_ENV === 'production';
  const prefix = isProd ? '/whatmorecouldyouneed.github.io' : '';
  
  const src = typeof props.src === 'string' 
    ? `${prefix}${props.src}` 
    : props.src;

  const { priority, ...imgProps } = props;
  
  return (
    <img 
      ref={ref}
      {...imgProps}
      src={src}
      loading={priority ? 'eager' : 'lazy'}
    />
  );
});

NextImage.displayName = 'NextImage';

export default NextImage;