// declare global types for libraries loaded via CDN
declare global {
  interface Window {
    THREE: any; // @types/three may be needed here later gtg rn
    THREEx: any; // THREEx doesn't have standard types
    MINDAR?: {
      IMAGE?: {
        Compiler?: new () => {
          compileImageTargets: (images: HTMLImageElement[], onProgress: (progress: number) => void) => Promise<void>;
          exportData: () => Promise<ArrayBuffer>;
        };
      };
    };
  }
}

// export an object to make this a module file
export {}; 