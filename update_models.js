const fs = require('fs');
let code = fs.readFileSync('src/state/models.ts', 'utf8');

code = code.replace(/export type NoteFolder = \{[\s\S]*?\}/, 
`export type Notebook = {
  id: string
  name: string
}

export type Section = {
  id: string
  notebookId: string
  name: string
}`);

code = code.replace(/export type Note = \{[\s\S]*?\}/,
`export type Note = {
  id: string
  sectionId?: string
  title: string
  content: string
  links: string[]
  linkedTaskIds: string[]
  tags: string[]
  updatedAt: string
}`);

code = code.replace(/noteFolders: NoteFolder\[\]/, 'notebooks: Notebook[]\n  sections: Section[]');

fs.writeFileSync('src/state/models.ts', code);
