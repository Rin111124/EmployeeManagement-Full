export const Theme = {
  colors: {
    background: '#0A0A0F',
    surface: '#131318',
    onSurface: '#E4E1E9',
    onSurfaceVariant: '#BBC9CF',
    outline: '#859398',
    outlineVariant: '#3C494E',
    
    cyan: {
      primary: '#A8E8FF',
      dim: '#3CD7FF',
      container: '#00D4FF',
      glow: 'rgba(0, 212, 255, 0.8)',
    },
    
    green: {
      primary: '#F5FFF3',
      fixed: '#60FF99',
      dim: '#00E479',
      container: '#34FF8D',
      glow: 'rgba(96, 255, 153, 0.8)',
    },
    
    red: {
      primary: '#FFD5D8',
      container: '#FFADB6',
      tertiary: '#FF3366', // Thêm màu đỏ HUD từ code gốc
      glow: 'rgba(255, 51, 102, 0.8)',
    }
  },
  
  fonts: {
    sans: 'System', // Plus Jakarta Sans sẽ fallback về System nếu không load font
    mono: 'monospace', // Space Grotesk
  }
};

export const Glows = {
  cyan: {
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  green: {
    shadowColor: '#60FF99',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  red: {
    shadowColor: '#FF3366',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  }
};
