import React from 'react';

const CATEGORIES = [
  {
    id: 'ICT',
    name: 'ICT',
    desc: 'Komputer, tablet, scanner, printer, network device, perangkat IT.',
    color: '#bfdbfe',
    bg: '#eff6ff',
    shadow: 'rgba(37,99,235,.1)'
  },
  {
    id: 'HRGA',
    name: 'HRGA',
    desc: 'Furniture, fasilitas umum, alat kantor non-IT.',
    color: '#fde68a',
    bg: '#fff6df',
    shadow: 'rgba(217,119,6,.1)'
  },
  {
    id: 'ENG',
    name: 'ENG',
    desc: 'Engineering tools, equipment teknis, mesin/utility support.',
    color: '#bbf7d0',
    bg: '#eafaf0',
    shadow: 'rgba(21,128,61,.1)'
  }
];

function OwnerCategorySelector({ selected, onSelect, disabled }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
      {CATEGORIES.map(c => {
        const isActive = selected === c.id;
        return (
          <div
            key={c.id}
            onClick={() => { if (!disabled) onSelect(c.id); }}
            style={{
              border: '2px solid',
              borderRadius: '16px',
              padding: '16px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: disabled ? 0.5 : 1,
              borderColor: isActive ? '#2563eb' : 'var(--border)',
              backgroundColor: isActive ? c.bg : '#fff',
              boxShadow: isActive ? `0 0 0 4px ${c.shadow}` : 'none'
            }}
            onMouseOver={(e) => {
              if (!disabled) e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseOut={(e) => {
              if (!disabled) e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--charcoal-900)' }}>{c.name}</h3>
            <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--charcoal-600)', lineHeight: 1.4 }}>{c.desc}</p>
          </div>
        );
      })}
    </div>
  );
}

export default OwnerCategorySelector;
