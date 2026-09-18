import * as T from 'three';

// Kana centre-lines transcribed from Bandai's Digimon Profile #016 chart:
// https://digimon.net/profile/report016/
// https://digimon.net/profile/images/profile/degimoji/degimoji_tate_pc.png
// The 1999 tunnel draws these forms as hollow, squared-off contours.
// This is a local vector reconstruction, not an extracted or remote font.
const PATHS={
 'ア':'M19 20H81V82H19Z',
 'イ':'M30 14H70V39H30Z M50 39V62 M30 62H70V87H30Z',
 'ウ':'M20 43H80V14H49V86H20V49',
 'エ':'M17 36V14H47V88H17V55H82V22 M57 51V66L82 86V36 M96 20V50H82',
 'オ':'M22 41H81V89H66V41 M51 14V88H22V41 M81 63H98',
 'カ':'M14 31L89 88V43H73 M39 11V88 M14 31V78L72 21',
 'キ':'M34 14L62 41L91 25L62 63V92L86 79 M34 14L42 54L13 66L48 72',
 'ク':'M50 13V88L18 73L72 34L50 13 M78 56V91 M63 65L91 84 M92 64L65 85',
 'ケ':'M23 36V15H67L23 86H63 M51 69L63 48H81V99',
 'コ':'M27 15L51 38L74 15 M29 48H72 M29 61H72 M51 63V73L29 92H73L51 73',
 'サ':'M18 15H83V53H18V89H83V69H35 M18 15V33H66',
 'シ':'M17 14V88H78V25H48V59H98',
 'ス':'M19 14H75V64H38V32H56V47 M19 14V68H58V93',
 'セ':'M21 14V70H51V33H81V98 M7 51H96',
 'ソ':'M25 40H67V69H25Z M67 13V94H25',
 'タ':'M16 76V21H54V91H91V20 M16 91V93',
 'チ':'M16 28H79V61H17V94H79 M32 11V45 M58 11V45',
 'ツ':'M17 16H84V63H32V42H62V91H17V66H32',
 'テ':'M6 15L29 52L49 15L68 52L91 15 M25 94L47 59L68 94',
 'ト':'M21 23H80V63H40V43H64V85H28 M51 12V97',
 'ナ':'M17 78V20H47V93H83V20H65V61H97 M17 93V96',
 'ニ':'M30 16V55 M14 25L45 47 M14 48L45 26 M74 16V55 M59 25L90 47 M59 48L90 26 M29 61L52 78L75 61 M52 78V96',
 'ヌ':'M13 12V63H55V38H30V93H63V69H89V44H66V12',
 'ネ':'M17 30H78L40 9V91H17V66H56V45H82V69H62V93H93V78',
 'ノ':'M19 47H55V87H19Z M42 21H78V62H42Z',
 'ハ':'M22 8V95 M66 9V61H85V30H43V95H85',
 'ヒ':'M23 13H44V93H82V13H63V44H11 M63 13V44H95',
 'フ':'M68 12H44V39H19V79 M92 37H67V66H41V94',
 'ヘ':'M59 10H23V44H55V90H23L67 25 M78 44V94 M62 57L94 82 M94 55L63 82',
 'ホ':'M20 9V94 M60 9V72 M79 30H43V94H86V60H60',
 'マ':'M51 12V67H75V34H32V94H74',
 'ミ':'M20 22H85 M43 8V75H20V44H80V95L59 65L42 95',
 'ム':'M30 43H51V14L76 45H55 M51 14V93H28V43 M79 61V93H51',
 'メ':'M29 27L24 10 M50 24V5 M73 27L79 10 M18 56V91H83V56 M33 43H69V70H33Z',
 'モ':'M17 12V92H83 M41 12V54H89 M64 12H86 M41 43H86 M9 62H91',
 'ヤ':'M19 14H62L19 95H79V49H51V70 M19 14V95',
 'ユ':'M30 15H50V91H75V15L9 80 M21 94H50 M30 15V80H75',
 'ヨ':'M17 65V94H37V13 M72 13V48 M58 19L87 41 M87 19L58 41 M72 59V94 M58 65L87 88 M87 65L58 88',
 'ラ':'M20 21H69 M47 8V93H29V49H75V38H60V68L24 40 M29 93H60V61 M42 76V77',
 'リ':'M18 15H40L18 50H40L18 97H43 M53 15H78L53 50H78L53 97H80 M18 15V97 M53 15V97',
 'ル':'M16 94L47 53V13H26V56L58 94L82 69V43H61V73L78 94',
 'レ':'M13 94V13L50 38H13V56L78 94V15L62 35H92V14 M13 94H34V65',
 'ロ':'M9 94L35 52V13H16V57L43 94L69 52V13H51V57L81 94V53',
 'ワ':'M16 94V53L77 94V32H17 M45 13V94 M45 13L74 33',
 'ヲ':'M19 12V94H65V29H39V72H56 M65 49H91',
 'ン':'M16 10H84V96H16Z M49 24V83 M30 33L70 74 M70 33L30 74',
 'ー':'M10 51H85L67 32 M85 51L67 70'
};
const VOICED={'デ':'テ','ジ':'シ'};
export const DIGIMOJI_KANA=Object.freeze([...Object.keys(PATHS),...Object.keys(VOICED)]);
export const DIGIMOJI_GRID=8;
export const DEVICE_INSCRIPTION='デジタルモンスターデジタルモンスター';
const stamps=new Map();

export function digimojiStamp(kana,ink='#ffffff'){
 const key=kana+ink;if(stamps.has(key))return stamps.get(key);
 const base=VOICED[kana]||kana;if(!PATHS[base])throw new Error('Unknown Digimoji kana: '+kana);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const g=canvas.getContext('2d'),path=new Path2D(PATHS[base]);
 g.translate(14,VOICED[kana]?32:14);g.scale(1,VOICED[kana]?.80:1);
 g.lineJoin='miter';g.lineCap='square';g.miterLimit=3;g.strokeStyle=ink;
 g.lineWidth=9;g.stroke(path);g.globalCompositeOperation='destination-out';g.lineWidth=5.1;g.stroke(path);
 if(VOICED[kana]){
  g.globalCompositeOperation='source-over';g.lineWidth=6;g.beginPath();
  g.moveTo(34,-18);g.lineTo(43,-6);g.moveTo(69,-18);g.lineTo(60,-6);g.stroke();
 }
 stamps.set(key,canvas);return canvas;
}

export function drawDigimoji(g,kana,x,y,size,ink='#ffffff'){
 g.drawImage(digimojiStamp(kana,ink),x,y,size,size);
}

export function createDigimojiAtlas(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=DIGIMOJI_GRID*128;
 const g=canvas.getContext('2d');
 DIGIMOJI_KANA.forEach((kana,i)=>g.drawImage(digimojiStamp(kana),i%DIGIMOJI_GRID*128,Math.floor(i/DIGIMOJI_GRID)*128));
 const atlas=new T.CanvasTexture(canvas);atlas.colorSpace=T.SRGBColorSpace;
 atlas.userData={alphabet:'Japanese Digimoji',kana:DIGIMOJI_KANA,grid:DIGIMOJI_GRID,source:'https://digimon.net/profile/report016/'};
 return atlas;
}
