declare global {
  interface Window {
    shopify?: {
      idToken?: () => Promise<string>;
    };
  }

  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
