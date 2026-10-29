// Paint controls use a 24px canvas with a centered 12px glyph, matching the
// measured Figma paint toolbar. These are separate from the editor tool icons.
const box='<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/>';
const glyphs={
 solid:box+'<rect x="8.5" y="8.5" width="7" height="7" rx=".5"/><path d="M9 9h6v6H9z" fill="currentColor" opacity=".35" stroke="none"/>',
 gradient:box+[[8.9,8.9,.85],[8.9,12,.85],[8.9,15.1,.85],[11.3,10.4,.7],[11.3,13.5,.7],[13.6,8.9,.6],[13.6,12,.6],[13.6,15.1,.6],[15.5,10.4,.45],[15.5,13.5,.45]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`).join(''),
 pattern:box+'<path d="M7 9.5h10M7 14.5h10M12 7v2M12 15v2M9.5 10v4M14.5 10v4"/>',
 image:box+'<circle cx="14.5" cy="9.5" r="1"/><path d="m8.5 13.5 2-2 4 4"/>',
 video:box+'<path d="M10 9.5v5l4.5-2.5z" stroke-linejoin="round"/>',
 shader:box+'<path d="M8.5 10c2-3 4 2 7-1M8.5 12.5c2-3 4 2 7-1M8.5 15c2-3 4 2 7-1"/>',
 blend:'<path d="M12 5.8S7.5 10 7.5 13c0 5.8 9 5.8 9 0 0-3-4.5-7.2-4.5-7.2Z"/>',
 contrast:'<circle cx="12" cy="12" r="6.5"/><path d="m5 19 14-14M8 8l4 4m-2-5 7 7"/>',
 pipette:'<path d="m13.5 8.5 3-3a1.8 1.8 0 0 1 2.5 2.5l-3 3M11.5 7.5l5 5M12 9l-6 6v2l-1 1 1 1 1-1h2l6-6"/>',
 rotate:'<path d="m10 6 3-2 3 2M13 4v5M17 10l3 3-5 5-5-5 5-5Z"/>',
 flip:'<path d="M6 9h12m-3-3 3 3-3 3M18 15H6m3-3-3 3 3 3"/>',
 close:'<path d="m7.5 7.5 9 9m0-9-9 9"/>',
 plus:'<path d="M12 6.5v11M6.5 12h11"/>',
 minus:'<path d="M6.5 12h11"/>',
 grid:'<rect x="6.5" y="6.5" width="4" height="4" rx="1"/><rect x="13.5" y="6.5" width="4" height="4" rx="1"/><rect x="6.5" y="13.5" width="4" height="4" rx="1"/><rect x="13.5" y="13.5" width="4" height="4" rx="1"/>',
 list:'<path d="M7 8h10M7 12h10M7 16h10"/>',
 search:'<circle cx="10.5" cy="10.5" r="3.5"/><path d="m13 13 4 4"/>',
};
export const paintPickerIcon=name=>glyphs[name]?`<svg class="paint-ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" aria-hidden="true">${glyphs[name]}</svg>`:'';
