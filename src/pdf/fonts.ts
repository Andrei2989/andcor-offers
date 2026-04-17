import { Font } from '@react-pdf/renderer';

// Inter supports Latin Extended-A which covers ă â î ș ț Ă Â Î Ș Ț
Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Inter-Medium.ttf', fontWeight: 500 },
    { src: '/fonts/Inter-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 700 },
  ],
});

// Disable automatic hyphenation — breaks Romanian product names awkwardly.
Font.registerHyphenationCallback((word) => [word]);
