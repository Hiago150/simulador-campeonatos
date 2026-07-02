/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vermelho sangue — a identidade (ação, ao-vivo, mandante)
        blood: {
          50: '#fff1f1',
          100: '#ffdfdf',
          200: '#ffc5c5',
          300: '#ff9d9d',
          400: '#ff6464',
          500: '#f83a3a',
          600: '#e01b1b',
          700: '#bd1212',
          800: '#9b1212',
          900: '#7f1414',
          950: '#460606'
        },
        // Pretos / superfícies — neutro profundo estilo app de placar
        ink: {
          950: '#0a0a0c',
          900: '#111114',
          850: '#16161a',
          800: '#1c1c22',
          700: '#26262e',
          600: '#34343e',
          500: '#4b4b58'
        },
        // Claro neutro para bordas/realces (antes "osso")
        paper: {
          DEFAULT: '#eceef2',
          dim: '#9a9ca6',
          faint: '#63656e'
        },
        // Remapeia o cinza para uma escala neutra fria — texto de "placar"
        zinc: {
          50: '#f7f8fa',
          100: '#eceef2',
          200: '#d7dae1',
          300: '#b3b7c1',
          400: '#8b8f9a',
          500: '#696d78',
          600: '#4e515b',
          700: '#383a42',
          800: '#232429',
          900: '#151518',
          950: '#0c0c0f'
        },
        // Verde — resultado positivo (vitória, saldo +, classificado, subiu)
        win: {
          300: '#7ee2ae',
          400: '#4ecf8e',
          500: '#2bb673',
          600: '#1f9a5f',
          700: '#177a4c',
          950: '#0a2417'
        },
        // Dourado — glória (campeão, títulos, MVP, recordes)
        gold: {
          200: '#ffe7ae',
          300: '#ffd97d',
          400: '#f5c451',
          500: '#e2a93a',
          600: '#c08a26',
          700: '#96691d',
          950: '#2b1f0a'
        }
      },
      fontFamily: {
        display: ['"Oswald Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk Variable"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(224,27,27,0.4), 0 0 24px -4px rgba(224,27,27,0.55)',
        'glow-sm': '0 0 16px -6px rgba(224,27,27,0.6)',
        card: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -14px rgba(0,0,0,0.9)',
        lift: '0 12px 32px -12px rgba(0,0,0,0.85)'
      },
      backgroundImage: {
        'blood-radial': 'radial-gradient(1200px 600px at 50% -20%, rgba(224,27,27,0.16), transparent 60%)',
        'blood-grad': 'linear-gradient(135deg, #e01b1b 0%, #7f1414 100%)',
        'gold-grad': 'linear-gradient(135deg, #f5c451 0%, #c08a26 100%)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(224,27,27,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(224,27,27,0)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.3s ease-out',
        'pulse-glow': 'pulse-glow 1.6s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
