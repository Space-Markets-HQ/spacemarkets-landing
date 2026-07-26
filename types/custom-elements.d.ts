import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "sm-globe-v2": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        framing?: string;
        dawn?: string;
        bloom?: string;
        limb?: string;
        stars?: string;
        grain?: string;
        zoom?: string;
        "label-inset"?: string;
        sats?: string;
        labels?: string;
        "orbit-scale"?: string;
        rings?: string;
      };
    }
  }
}
