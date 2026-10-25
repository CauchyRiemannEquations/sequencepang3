// Only repair focus if the keyboard user's focused tile is about to disappear.
// Moving to a toolbar or dialog during the match animation cancels the repair.
export function shouldRestoreMatchFocus(keyboard:boolean,active:Element|null,removed:string[]){
 const id=active?.getAttribute('data-tile');
 return keyboard&&!!id&&removed.includes(id);
}
export function focusDestination(root:HTMLElement,screen:string){
 if(root.querySelector('dialog[open]'))return;
 const selectors=screen==='game'?['.tile.available','.notice']:screen==='clear'?['.clear-content .primary']:screen==='stages'?['.chapter:not([inert]) .stage-card.current:not(:disabled)','.chapter:not([inert]) .stage-card:not(:disabled)']:['.home-content .start'];
 for(const selector of selectors){
  const target=root.querySelector<HTMLElement>(selector);
  if(target){target.focus({preventScroll:true});return;}
 }
}
