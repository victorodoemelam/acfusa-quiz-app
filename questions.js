const normalizeText=value=>value
    .replace(/\u2028|\u2029/g,'\n')
    .replace(/\r/g,'')
    .replace(/[ \t]+/g,' ')
    .replace(/ *\n */g,'\n')
    .trim();

function splitNumberedQuestions(section){
    return normalizeText(section)
        .split(/(?=^\d+\.\s*)/gm)
        .filter(block=>/^\d+\./.test(block.trim()));
}

function parseQuestionBlock(block){
    const clean=normalizeText(block).replace(/^(\d+)\.\s*/,'');
    const sourceNumber=Number((block.match(/^(\d+)\./)||[])[1]||0);
    const answerMatch=clean.match(/(?:^|\n)\s*Answer\s*[:;]\s*([\s\S]*?)(?=\n\s*(?:Reference|Difficulty|DIfficulty|HARD|MEDIUM|Easy)\b|$)/i);
    const referenceMatch=clean.match(/(?:^|\n)\s*Reference\s*:?\s*([\s\S]*?)(?=\n\s*(?:Answer|Difficulty|DIfficulty|HARD|MEDIUM|Easy)\b|$)/i);
    const difficultyMatch=clean.match(/(?:Difficulty\s*:?\s*)?(EASY|MEDIUM|HARD)\s*[–—-]?\s*(\d+)\s*Points/i);
    const markedAnswer=(clean.split('\n').find(line=>line.includes('✅'))||'').replace('✅','').trim();
    const metadataStart=[
        clean.search(/(?:^|\n)\s*Reference\s*:?/i),
        clean.search(/(?:^|\n)\s*Answer\s*[:;]/i),
        clean.search(/(?:^|\n)\s*(?:Difficulty\s*:?\s*)?(?:EASY|MEDIUM|HARD)\s*[–—-]?\s*\d+\s*Points/i)
    ].filter(index=>index>=0);
    let question=clean.slice(0,metadataStart.length?Math.min(...metadataStart):clean.length);
    question=question.replace(/✅/g,'').replace(/\n?Difficulty[\s\S]*$/i,'').trim();
    const difficulty=difficultyMatch?difficultyMatch[1][0].toUpperCase()+difficultyMatch[1].slice(1).toLowerCase():'Medium';
    const points=difficultyMatch?Number(difficultyMatch[2]):({Easy:5,Medium:15,Hard:20}[difficulty]);
    return {
        sourceNumber,
        question,
        answer:normalizeText(answerMatch?.[1]||markedAnswer||'Answer provided by the quiz moderator.'),
        reference:normalizeText(referenceMatch?.[1]||'').replace(/[()]/g,''),
        difficulty,
        points
    };
}

function parseBonusQuestions(section){
    const matches=[...normalizeText(section).matchAll(/([\s\S]*?Difficulty\s*:\s*HARD\s*[–—-]\s*20\s*Points)/gi)];
    return matches.map((match,index)=>{
        const question=parseQuestionBlock((index+1)+'. '+match[1]);
        question.question=question.question
            .replace(/^BONUS ROUND\s*\([^)]*\)\s*/i,'')
            .replace(/^•\s*/,'');
        return question;
    });
}

const varsityStart=RAW_QUESTION_SOURCE.indexOf('HARD and MEDIUM SET VARSITY');
const juniorStart=RAW_QUESTION_SOURCE.indexOf('MAIN QUIZ - JUNIOR');
const bonusStart=RAW_QUESTION_SOURCE.indexOf('BONUS ROUND');

const varsitySource=RAW_QUESTION_SOURCE.slice(varsityStart,juniorStart);
const juniorSource=RAW_QUESTION_SOURCE.slice(juniorStart,bonusStart)
    .replace(/(\n)[^\S\r\n]*(?:•[^\S\r\n]*)?“You have nothing to draw with/,(match,newline)=>newline+'4. “You have nothing to draw with')
    .replace(/(29\. Quote\s+Luke 4:18\s*—)\s*“\s*(?=\n)/i,'$1')
    .replace(/((?:^|\n)\s*\d+\.\s*Quote\s*:?[ \t]+(?:Matthew|Mark|Luke|John)\s+\d+:\d+\s*—)\s*(\S[^\n]*)\n\s*Answer\s*[:;]\s*[^\n]*/gi,
        (match,prompt,verse)=>prompt+'\nAnswer: '+verse);
const bonusSource=RAW_QUESTION_SOURCE.slice(bonusStart);

let VARSITY_QUESTIONS=splitNumberedQuestions(varsitySource).map(parseQuestionBlock);
let foundJohn524=false;
VARSITY_QUESTIONS=VARSITY_QUESTIONS.filter(question=>{
    const isJohn524=/John\s*5\s*:\s*24/i.test(question.reference+' '+question.answer);
    if(!isJohn524)return true;
    if(foundJohn524)return false;
    foundJohn524=true;
    return true;
}).slice(0,50);

const BONUS_QUESTIONS=parseBonusQuestions(bonusSource).slice(0,5);
let JUNIOR_QUESTIONS=splitNumberedQuestions(juniorSource).map(parseQuestionBlock);
if(JUNIOR_QUESTIONS.length===49&&BONUS_QUESTIONS.length){
    JUNIOR_QUESTIONS.push({...BONUS_QUESTIONS[BONUS_QUESTIONS.length-1],sourceNumber:50});
}
JUNIOR_QUESTIONS=JUNIOR_QUESTIONS.slice(0,50);

const QUIZ_DATA={junior:JUNIOR_QUESTIONS,varsity:VARSITY_QUESTIONS,bonus:BONUS_QUESTIONS};
