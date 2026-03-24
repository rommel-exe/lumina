const fs = require('fs');
let code = fs.readFileSync('src/features/notes/NotesView.tsx', 'utf8');

code = code.replace(/import { useState, useMemo } from 'react'/, "import { useState, useMemo, useEffect } from 'react'");

let searchStr = `  const handleAddNote = () => {`;
let insertStr = `  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleAddNote()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedSectionId])

  const handleAddNote = () => {`;
  
code = code.replace(searchStr, insertStr);
fs.writeFileSync('src/features/notes/NotesView.tsx', code);
