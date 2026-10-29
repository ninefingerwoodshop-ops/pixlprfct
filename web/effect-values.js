// Disabled effects retain their authored values for editing and persistence.
// Older documents have no flag and keep their existing rendering.
export const effectBlur=(style,key)=>style?.[key+'_enabled']===false?0:(style?.[key]??0);
