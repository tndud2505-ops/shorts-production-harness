import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
Config.setConcurrency(2); // keep the local draft render modest
Config.setChromiumOpenGlRenderer("angle");
