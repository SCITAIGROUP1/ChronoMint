import { base } from "@chronomint/config-eslint/base";
import { nestLayers } from "@chronomint/config-eslint/nest";
import { reactLayers } from "@chronomint/config-eslint/react";

export default [...base, ...nestLayers, ...reactLayers];
