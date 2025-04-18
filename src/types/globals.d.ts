// declare global types for libraries loaded via CDN
declare global {
  interface Window {
    THREE: any; // @types/three may be needed here later gtg rn
    THREEx: any; // THREEx doesn't have standard types
  }
}

// export an object to make this a module file
export {}; 