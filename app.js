const QUIZ_PASSWORD='1986';
const CATEGORY_NAMES={junior:'JUNIOR',varsity:'VARSITY',bonus:'BONUS ROUND'};
const screens=[...document.querySelectorAll('.screen')];
const usedQuestions=new Set();
let selectedCategory='';
let selectedRound=0;
let currentQuestions=[];
let countdownId;
let answerDelayId;

function showScreen(id){
    screens.forEach(screen=>screen.classList.toggle('hidden',screen.id!==id));
    window.scrollTo(0,0);
}

function randomSeed(){
    if(window.crypto?.getRandomValues){
        return window.crypto.getRandomValues(new Uint32Array(1))[0];
    }
    return Date.now()>>>0;
}

function seededRandom(seed){
    return ()=>{
        seed|=0;
        seed=seed+0x6D2B79F5|0;
        let value=Math.imul(seed^seed>>>15,1|seed);
        value=value+Math.imul(value^value>>>7,61|value)^value;
        return ((value^value>>>14)>>>0)/4294967296;
    };
}

const sessionRandom=seededRandom(randomSeed());
function shuffle(items){
    const copy=[...items];
    for(let index=copy.length-1;index>0;index--){
        const swapIndex=Math.floor(sessionRandom()*(index+1));
        [copy[index],copy[swapIndex]]=[copy[swapIndex],copy[index]];
    }
    return copy;
}

function createBalancedRounds(questions){
    const rounds=[[],[]];
    const groups=['Easy','Medium','Hard'].map(level=>shuffle(questions.filter(question=>question.difficulty===level)));
    groups.forEach((group,groupIndex)=>{
        group.forEach((question,index)=>{
            let target;
            if(rounds[0].length===rounds[1].length)target=(index+groupIndex)%2;
            else target=rounds[0].length<rounds[1].length?0:1;
            rounds[target].push(question);
        });
    });
    return rounds.map(round=>shuffle(round));
}

const preparedRounds={
    junior:createBalancedRounds(QUIZ_DATA.junior),
    varsity:createBalancedRounds(QUIZ_DATA.varsity),
    bonus:[shuffle(QUIZ_DATA.bonus)]
};

document.getElementById('accessForm').addEventListener('submit',event=>{
    event.preventDefault();
    const input=document.getElementById('passwordInput');
    const error=document.getElementById('accessError');
    if(input.value===QUIZ_PASSWORD){
        error.textContent='';
        input.value='';
        showScreen('categoryScreen');
    }else{
        error.textContent='Incorrect password. Please try again.';
        input.value='';
        input.focus();
    }
});

document.querySelectorAll('[data-category]').forEach(button=>{
    button.addEventListener('click',()=>{
        selectedCategory=button.dataset.category;
        if(selectedCategory==='bonus'){
            selectedRound=0;
            openBoard();
            return;
        }
        document.getElementById('roundEyebrow').textContent=CATEGORY_NAMES[selectedCategory]+' QUIZ';
        showScreen('roundScreen');
    });
});

document.querySelectorAll('[data-round]').forEach(button=>{
    button.addEventListener('click',()=>{
        selectedRound=Number(button.dataset.round);
        openBoard();
    });
});

document.querySelectorAll('[data-action="categories"]').forEach(button=>{
    button.addEventListener('click',()=>showScreen('categoryScreen'));
});

document.querySelectorAll('[data-action="rounds"]').forEach(button=>{
    button.addEventListener('click',()=>{
        showScreen(selectedCategory==='bonus'?'categoryScreen':'roundScreen');
    });
});

function openBoard(){
    currentQuestions=preparedRounds[selectedCategory][selectedRound];
    const categoryName=CATEGORY_NAMES[selectedCategory];
    const roundLabel=selectedCategory==='bonus'?'Tie-breaker questions':'Round '+(selectedRound+1);
    document.getElementById('boardEyebrow').textContent=categoryName;
    document.getElementById('boardTitle').textContent=roundLabel;
    renderBoard();
    showScreen('boardScreen');
}

function questionKey(index){
    return selectedCategory+'-'+selectedRound+'-'+index;
}

function renderBoard(){
    const board=document.getElementById('questionBoard');
    board.replaceChildren();
    currentQuestions.forEach((question,index)=>{
        const button=document.createElement('button');
        button.type='button';
        button.className='question-card';
        if(usedQuestions.has(questionKey(index)))button.classList.add('used');
        const label=document.createElement('span');
        label.textContent='Question '+(index+1);
        const points=document.createElement('strong');
        points.textContent=question.points+' pts';
        button.append(label,points);
        button.addEventListener('click',()=>openQuestion(question,index));
        board.appendChild(button);
    });
    updateProgress();
}

function updateProgress(){
    const used=currentQuestions.filter((_,index)=>usedQuestions.has(questionKey(index))).length;
    document.getElementById('boardProgress').textContent=used+' / '+currentQuestions.length+' used';
}

function getQuestionReference(question){
    if(question.reference)return question.reference;
    const text=question.question+' '+question.answer;
    const references=[...text.matchAll(/\b(?:Matthew|Mark|Luke|John)\s+\d+\s*:\s*\d+(?:\s*[–—-]\s*\d+)?/gi)]
        .map(match=>match[0].replace(/\s+/g,' ').replace(/\s*:\s*/,':'));
    return [...new Set(references)].join('; ');
}

function openQuestion(question,index){
    usedQuestions.add(questionKey(index));
    renderBoard();
    document.getElementById('questionDifficulty').textContent=question.difficulty;
    document.getElementById('questionPoints').textContent=question.points+' points';
    document.getElementById('questionText').textContent=question.question;
    document.getElementById('answerText').textContent=question.answer;
    const reference=getQuestionReference(question);
    const answerReference=document.getElementById('answerReference');
    answerReference.textContent=reference?'Bible Reference: '+reference:'';
    answerReference.classList.toggle('hidden',!reference);
    document.getElementById('answerBox').classList.add('hidden');
    document.getElementById('showAnswer').classList.add('hidden');
    document.getElementById('questionModal').classList.remove('hidden');
    startTimer();
}

function startTimer(){
    clearInterval(countdownId);
    clearTimeout(answerDelayId);
    let timeLeft=30;
    const timer=document.getElementById('timer');
    timer.textContent=timeLeft;
    timer.classList.remove('time-up');
    countdownId=setInterval(()=>{
        timeLeft-=1;
        if(timeLeft<=0){
            clearInterval(countdownId);
            timer.textContent='TIME UP';
            timer.classList.add('time-up');
        }else timer.textContent=timeLeft;
    },1000);
    answerDelayId=setTimeout(()=>document.getElementById('showAnswer').classList.remove('hidden'),3000);
}

function closeQuestion(){
    clearInterval(countdownId);
    clearTimeout(answerDelayId);
    document.getElementById('questionModal').classList.add('hidden');
}

document.getElementById('showAnswer').addEventListener('click',()=>{
    document.getElementById('answerBox').classList.remove('hidden');
});
document.getElementById('closeModal').addEventListener('click',closeQuestion);
document.getElementById('questionModal').addEventListener('click',event=>{
    if(event.target.id==='questionModal')closeQuestion();
});
document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!document.getElementById('questionModal').classList.contains('hidden'))closeQuestion();
});
