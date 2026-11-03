import React from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

export default function HomeTestArtwork() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 140 160" accessible={false}>
      <Defs>
        <LinearGradient id="homeGlass" x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor="#FFFFFF" stopOpacity={0.95} />
          <Stop offset="1" stopColor="#DBBFFF" stopOpacity={0.65} />
        </LinearGradient>
        <LinearGradient id="homeLiquid" x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor="#BE8BFF" />
          <Stop offset="1" stopColor="#5E26C7" />
        </LinearGradient>
        <LinearGradient id="homeCap" x1="0" y1="0" x2="1" y2="0">
          <Stop stopColor="#F1E4FF" />
          <Stop offset="1" stopColor="#AD7DE9" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="77" cy="143" rx="50" ry="9" fill="#33116E" opacity={0.18} />
      <Circle cx="82" cy="82" r="52" fill="#FFFFFF" fillOpacity={0.05} stroke="#FFFFFF" strokeOpacity={0.1} />
      <G transform="rotate(16 86 78)">
        <Rect x="68" y="29" width="31" height="99" rx="15" fill="url(#homeGlass)" stroke="#FFFFFF" strokeOpacity={0.6} />
        <Path d="M72 75h23v38a11.5 11.5 0 0 1-23 0z" fill="url(#homeLiquid)" />
        <Rect x="64" y="21" width="39" height="18" rx="6" fill="url(#homeCap)" />
        <Path d="M73 46v54" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth="3" strokeLinecap="round" />
        <Path d="M85 55h9m-9 9h9m-9 9h9" stroke="#A577D9" strokeWidth="2" />
      </G>
      <G transform="rotate(-16 38 102)">
        <Rect x="26" y="68" width="24" height="69" rx="12" fill="url(#homeGlass)" stroke="#FFFFFF" strokeOpacity={0.5} />
        <Path d="M29 99h18v26a9 9 0 0 1-18 0z" fill="#C5A2FF" />
        <Rect x="23" y="61" width="30" height="15" rx="5" fill="url(#homeCap)" />
        <Path d="M32 82v31" stroke="#FFFFFF" strokeWidth="2" strokeOpacity={0.8} strokeLinecap="round" />
      </G>
      <Rect x="103" y="99" width="27" height="27" rx="9" fill="#FFFFFF" />
      <Path d="M111 112h11m-5.5-5.5v11" stroke="#8343DD" strokeWidth="3" strokeLinecap="round" />
      <Path d="M29 35h10m-5-5v10M115 59h8m-4-4v8" stroke="#D9B7FF" strokeWidth="2" strokeLinecap="round" />
      <Circle cx="111" cy="31" r="3" fill="#DCC1FF" />
    </Svg>
  );
}
