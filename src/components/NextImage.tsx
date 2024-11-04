import Image, { ImageProps } from 'next/image';

const NextImage = (props: ImageProps) => {
  const isProd = process.env.NODE_ENV === 'production';
  const prefix = isProd ? '/whatmorecouldyouneed.github.io' : '';
  
  const src = typeof props.src === 'string' 
    ? `${prefix}${props.src}` 
    : props.src;

  return <Image {...props} src={src} />;
};

export default NextImage;