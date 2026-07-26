"use client";

import { useEffect } from "react";

interface Props {
  style?: React.CSSProperties;
  framing?: string;
  dawn?: string;
  bloom?: string;
  limb?: string;
  grain?: string;
  zoom?: string;
  sats?: string;
  labels?: string;
  "orbit-scale"?: string;
  rings?: string;
}

/* Renders the <sm-globe-v2> custom element and registers its definition on the
   client. The element upgrades in place once the module loads. */
export default function GlobeV2(props: Props) {
  useEffect(() => {
    import("./sm-globe-v2.js");
  }, []);
  return <sm-globe-v2 {...props} />;
}
