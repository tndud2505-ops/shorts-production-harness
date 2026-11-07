import React from "react";
import { Composition } from "remotion";
import { ReferencePoseSheet } from "./ReferencePoseSheet";
import { BalloonTypeSheet } from "./BalloonTypeSheet";
import { SvgInventorySheet, SvgInventoryProps } from "./SvgInventorySheet";
import { CleanRetrospectiveFilm } from "./CleanRetrospectiveFilm";
import preview from "../../episodes/ep08-full-reference/runtime.preview.json";
import { EpisodeProps, timelineFor } from "./episode";
const previewProps = preview as EpisodeProps;

// A registered implementation pattern, not a constraint on future videos.
export const RemotionRoot: React.FC = () => <>
  <Composition id="ReferencePoseSheet" component={ReferencePoseSheet} fps={30} width={1600} height={850} durationInFrames={120}/>
  <Composition id="BalloonTypeSheet" component={BalloonTypeSheet} fps={30} width={1280} height={850} durationInFrames={1}/>
  <Composition id="SvgInventorySheet" component={SvgInventorySheet} defaultProps={{group:"mascot"} as SvgInventoryProps} fps={30} width={1600} height={1040} durationInFrames={1}/>
  <Composition id="PurposeRetrospective" component={CleanRetrospectiveFilm}
    defaultProps={previewProps} fps={preview.episode.fps} width={preview.episode.width} height={preview.episode.height}
    durationInFrames={timelineFor(previewProps).totalFrames}
    calculateMetadata={({props}: {props:EpisodeProps})=>{
      const t=timelineFor(props);
      return {fps:t.episode.fps,width:t.episode.width,height:t.episode.height,durationInFrames:t.totalFrames};
    }}/>
</>;
