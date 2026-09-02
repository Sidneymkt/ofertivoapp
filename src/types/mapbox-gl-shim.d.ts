declare module 'mapbox-gl' {
  namespace mapboxgl {
    interface GeoJSONSource {
      setData(data: any): void;
      [key: string]: any;
    }

    class Map {
      [key: string]: any;
      constructor(options?: any);
      on(event: string, callback: (...args: any[]) => void): this;
      once(event: string, callback: (...args: any[]) => void): this;
      off(event: string, callback: (...args: any[]) => void): this;
      addControl(control: any, position?: string): this;
      remove(): void;
      resize(): void;
      getCenter(): any;
      flyTo(options: any): void;
      setStyle(style: string): void;
      getSource(id: string): GeoJSONSource | undefined;
      addSource(id: string, source: any): void;
      addLayer(layer: any): void;
    }

    class Popup {
      [key: string]: any;
      constructor(options?: any);
      setHTML(html: string): this;
      setDOMContent(node: Node): this;
    }

    class Marker {
      [key: string]: any;
      constructor(options?: any);
      setLngLat(coords: [number, number]): this;
      setPopup(popup: Popup): this;
      addTo(map: Map): this;
      remove(): void;
      togglePopup(): this;
    }

    class NavigationControl { constructor(options?: any); }
    class GeolocateControl { constructor(options?: any); }

    let accessToken: string;
  }

  export = mapboxgl;
}


