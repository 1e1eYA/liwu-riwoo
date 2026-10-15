// Recipient names stay identical in every letter language.
export const RECIPIENT_NAMES={stage:'RIWOO',real:'이상혁'};
export function recipientName(s){return RECIPIENT_NAMES[s.letter?.recipient==='real'?'real':'stage'];}
export const LETTER_LANGUAGES={
 zh:{label:'中文',names:['RIWOO','常赫'],dear:n=>`亲爱的 ${n}，`,lines:['我送给你','送给你','还想送给你'],end:['，','，','。'],body:'一小段自由书写区'},
 en:{label:'English',names:['RIWOO','SANGHYEOK'],dear:n=>`Dear ${n},`,lines:['I give you','I give you','And I also want to give you'],end:[',',',','.'],body:'A little love in your own words'},
 ko:{label:'한국어',names:['리우','상혁'],dear:n=>`사랑하는 ${n}에게,`,lines:['너에게 주고 싶은 건','그리고','또 주고 싶은 건'],end:[',',',','.'],body:'나의 마음을 자유롭게 적어 주세요'},
 ja:{label:'日本語',names:['RIWOO','サンヒョク'],dear:n=>`大好きな ${n}へ、`,lines:['あなたに贈るのは','そして','もうひとつ贈りたいのは'],end:['、','、','。'],body:'自由に気持ちを書いてください'}
};
export function letterPreferences(s){const l=s.letter;return {...l,language:LETTER_LANGUAGES[l.language]?l.language:LETTER_LANGUAGES[s.locale]?s.locale:'en',recipient:l.recipient==='real'?'real':'stage',giftNames:Array.isArray(l.giftNames)&&l.giftNames.length===3?l.giftNames:s.gifts.map(g=>g.name)};}
export function letterContent(s){const l=letterPreferences(s),v=LETTER_LANGUAGES[l.language];return {language:l.language,greeting:v.dear(recipientName(s)),gifts:v.lines.map((line,i)=>`${line} ${l.giftNames[i]}${v.end[i]}`),body:l.body,from:`FROM. ${l.from}`};}
export function composeLetter(s){const l=letterContent(s);return `${l.greeting}\n${l.gifts.join('\n')}\n\n${l.body}\n\n${l.from}`;}
