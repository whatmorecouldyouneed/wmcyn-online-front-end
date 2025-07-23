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
  const src = props.src;

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