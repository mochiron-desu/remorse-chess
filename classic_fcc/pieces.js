// High-resolution vector SVG chess pieces (standard cburnett / Lichess piece set)
const CHESS_PIECES = {
  wP: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <path d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 H 34 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
          fill="#ffffff" stroke="#000000" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  wN: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" fill="#ffffff" />
      <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,7.4 17.05,4.7 18.5,4.5 C 20,4.5 22.5,6.5 22,10 z" fill="#ffffff" />
      <path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" fill="#000000" />
      <path d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z" fill="#000000" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" />
    </g>
  </svg>`,
  wB: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <g fill="#ffffff" stroke-linecap="butt">
        <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.54 9,36 9,36 z" />
        <path d="M 12,36 C 12,32 15,31 15,31 C 15,31 16.5,28.5 15,26 C 14,24.5 13,22 13,19 C 13,13.5 17,9 22.5,9 C 28,9 32,13.5 32,19 C 32,22 31,24.5 30,26 C 28.5,28.5 30,31 30,31 C 30,31 33,32 33,36 z" />
        <path d="M 22.5,9 C 22.5,9 20,7 20,5.5 C 20,4 21,3 22.5,3 C 24,3 25,4 25,5.5 C 25,7 22.5,9 22.5,9 z" />
      </g>
      <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18" />
    </g>
  </svg>`,
  wR: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="#ffffff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 9,39 L 36,39 L 36,36 L 9,36 z" />
      <path d="M 12,36 L 12,32 L 33,32 L 33,36 z" />
      <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" />
      <path d="M 12,14 L 33,14 L 31,32 L 14,32 z" />
      <path d="M 14,29.5 L 31,29.5 M 14,16.5 L 31,16.5" stroke-linejoin="miter" />
    </g>
  </svg>`,
  wQ: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="#ffffff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 8 12 A 2 2 0 1 1 8,8 A 2 2 0 1 1 8 12 z M 15 9 A 2 2 0 1 1 15,5 A 2 2 0 1 1 15 9 z M 22.5 8 A 2 2 0 1 1 22.5,4 A 2 2 0 1 1 22.5 8 z M 30 9 A 2 2 0 1 1 30,5 A 2 2 0 1 1 30 9 z M 37 12 A 2 2 0 1 1 37,8 A 2 2 0 1 1 37 12 z" />
      <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38,14 L 31,25 L 22.5,10 L 14,25 L 7,14 z" />
      <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 10.5,36 10.5,36 C 9,37.5 11,38.5 11,38.5 L 34,38.5 C 34,38.5 36,37.5 34.5,36 C 34.5,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 z" />
      <path d="M 11.5,30 C 15,29 30,29 33.5,30 M 12,33.5 C 18,32.5 27,32.5 33,33.5" />
    </g>
  </svg>`,
  wK: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 22.5,11.63 L 22.5,6 M 20,8 L 25,8" stroke-linejoin="miter" />
      <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 24,11.5 21,11.5 22.5,25 z" fill="#ffffff" />
      <path d="M 12.5,37 C 14,30.5 17.5,29.5 22.5,29.5 C 27.5,29.5 31,30.5 32.5,37 z" fill="#ffffff" />
      <path d="M 11.5,30 C 15,27 22.5,26.5 22.5,26.5 C 22.5,26.5 30,27 33.5,30 C 35.5,25.5 36.5,17 33,14 C 29.5,11 25.5,13.5 22.5,15.5 C 19.5,13.5 15.5,11 12,14 C 8.5,17 9.5,25.5 11.5,30 z" fill="#ffffff" />
      <path d="M 11.5,37 C 17,40.5 28,40.5 33.5,37" />
      <path d="M 11.5,40 C 17,43.5 28,43.5 33.5,40" />
      <path d="M 11.5,43 C 17,46.5 28,46.5 33.5,43" />
    </g>
  </svg>`,
  bP: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <path d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 H 34 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
          fill="#222222" stroke="#000000" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  bN: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" fill="#222222" />
      <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,7.4 17.05,4.7 18.5,4.5 C 20,4.5 22.5,6.5 22,10 z" fill="#222222" />
      <path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" fill="#ffffff" stroke="#ffffff" />
      <path d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z" fill="#ffffff" stroke="#ffffff" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" />
      <path d="M 24.55,10.4 C 24.2,11.8 23,12.8 22.1,14.8 C 21.6,16 22,17 22.5,17.5" stroke="#ffffff" stroke-width="1"/>
    </g>
  </svg>`,
  bB: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <g fill="#222222" stroke-linecap="butt">
        <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.54 9,36 9,36 z" />
        <path d="M 12,36 C 12,32 15,31 15,31 C 15,31 16.5,28.5 15,26 C 14,24.5 13,22 13,19 C 13,13.5 17,9 22.5,9 C 28,9 32,13.5 32,19 C 32,22 31,24.5 30,26 C 28.5,28.5 30,31 30,31 C 30,31 33,32 33,36 z" />
        <path d="M 22.5,9 C 22.5,9 20,7 20,5.5 C 20,4 21,3 22.5,3 C 24,3 25,4 25,5.5 C 25,7 22.5,9 22.5,9 z" />
      </g>
      <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18" stroke="#ffffff" />
    </g>
  </svg>`,
  bR: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="#222222" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 9,39 L 36,39 L 36,36 L 9,36 z" />
      <path d="M 12,36 L 12,32 L 33,32 L 33,36 z" />
      <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" />
      <path d="M 12,14 L 33,14 L 31,32 L 14,32 z" />
      <path d="M 14,29.5 L 31,29.5 M 14,16.5 L 31,16.5" stroke="#ffffff" stroke-linejoin="miter" />
    </g>
  </svg>`,
  bQ: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="#222222" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 8 12 A 2 2 0 1 1 8,8 A 2 2 0 1 1 8 12 z M 15 9 A 2 2 0 1 1 15,5 A 2 2 0 1 1 15 9 z M 22.5 8 A 2 2 0 1 1 22.5,4 A 2 2 0 1 1 22.5 8 z M 30 9 A 2 2 0 1 1 30,5 A 2 2 0 1 1 30 9 z M 37 12 A 2 2 0 1 1 37,8 A 2 2 0 1 1 37 12 z" />
      <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38,14 L 31,25 L 22.5,10 L 14,25 L 7,14 z" />
      <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 10.5,36 10.5,36 C 9,37.5 11,38.5 11,38.5 L 34,38.5 C 34,38.5 36,37.5 34.5,36 C 34.5,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 z" />
      <path d="M 11.5,30 C 15,29 30,29 33.5,30 M 12,33.5 C 18,32.5 27,32.5 33,33.5" stroke="#ffffff" />
    </g>
  </svg>`,
  bK: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 22.5,11.63 L 22.5,6 M 20,8 L 25,8" stroke-linejoin="miter" stroke="#ffffff" />
      <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 24,11.5 21,11.5 22.5,25 z" fill="#222222" />
      <path d="M 12.5,37 C 14,30.5 17.5,29.5 22.5,29.5 C 27.5,29.5 31,30.5 32.5,37 z" fill="#222222" />
      <path d="M 11.5,30 C 15,27 22.5,26.5 22.5,26.5 C 22.5,26.5 30,27 33.5,30 C 35.5,25.5 36.5,17 33,14 C 29.5,11 25.5,13.5 22.5,15.5 C 19.5,13.5 15.5,11 12,14 C 8.5,17 9.5,25.5 11.5,30 z" fill="#222222" />
      <path d="M 11.5,37 C 17,40.5 28,40.5 33.5,37" stroke="#ffffff" />
      <path d="M 11.5,40 C 17,43.5 28,43.5 33.5,40" stroke="#ffffff" />
      <path d="M 11.5,43 C 17,46.5 28,46.5 33.5,43" stroke="#ffffff" />
    </g>
  </svg>`
};
