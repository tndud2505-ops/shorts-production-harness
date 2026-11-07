import React, { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

// Prefer the installed Windows font; ship OFL Noto Sans KR for other hosts.
export const DraftFontLoader: React.FC = () => {
  const [handle] = useState(() => delayRender("Loading Korean fonts"));
  useEffect(() => {
    let active = true;
    Promise.all([
      document.fonts.load('400 48px "Draft Malgun"', "한글 4,591원"),
      document.fonts.load('700 64px "Draft Malgun"', "한글 4,591원"),
    ]).then(() => document.fonts.ready).then(() => {
      if (active) continueRender(handle);
    }).catch((error: unknown) => {
      console.warn("Draft Korean font failed", error);
      if (active) continueRender(handle);
    });
    return () => { active = false; };
  }, [handle]);
  return <style>{`
    @font-face { font-family: 'Draft Malgun'; src: local("Malgun Gothic"), url('${staticFile("fonts/noto/NotoSansKR.ttf")}') format('truetype'); font-style: normal; font-weight: 400; font-display: block; }
    @font-face { font-family: 'Draft Malgun'; src: local("Malgun Gothic Bold"), url('${staticFile("fonts/noto/NotoSansKR.ttf")}') format('truetype'); font-style: normal; font-weight: 700; font-display: block; }
  `}</style>;
};
