const recipes = [
  { season: "AUTUMN / 30MIN", title: "栗とカスタードのパイ", description: "ほくほくの栗と、とろけるカスタードクリームを重ねた秋のおやつ。", image: "https://placehold.jp/600x400.png?text=Item" },
  { season: "AUTUMN / 45MIN", title: "柿のタルト", description: "甘く熟した柿をたっぷりのせた、香ばしいアーモンドタルト。", image: "https://placehold.jp/600x400.png?text=Item" },
  { season: "AUTUMN / 20MIN", title: "さつま芋のスコーン", description: "季節のさつま芋を生地に練り込み、朝食にもぴったりの一品。", image: "https://placehold.jp/600x400.png?text=Item" },
  { season: "WINTER / 35MIN", title: "りんごのキャラメルケーキ", description: "香ばしいキャラメルと酸味のあるりんごを重ねた、冬の定番ケーキ。", image: "https://placehold.jp/600x400.png?text=Item" },
  { season: "WINTER / 25MIN", title: "みかんのシフォンケーキ", description: "みかんの爽やかな香りを生地に閉じ込めた、ふんわり軽いケーキ。", image: "https://placehold.jp/600x400.png?text=Item" }
];

const voices = [
  { name: "Aさん", role: "HOME BAKER", comment: "工程が短い文章でまとまっているので、初めてでも失敗せず作れました。家族にも好評です。", avatar: "https://placehold.jp/150x150.png?text=User" },
  { name: "Mさん", role: "WEEKEND COOK", comment: "旬の果物を使うレシピなので、季節ごとに楽しめるのがうれしいです。献立づくりの参考にもなります。", avatar: "https://placehold.jp/150x150.png?text=User" },
  { name: "Tさん", role: "READER", comment: "写真がなくても手順のイメージがしやすく、普段使う道具で作れました。", avatar: "https://placehold.jp/150x150.png?text=User" }
];

const faqs = [
  { question: "初心者でも作れますか？", answer: "はい。難易度をレシピごとに示し、基本的な工程やポイントを丁寧に解説しています。まずは20〜30分程度のレシピがおすすめです。" },
  { question: "材料の代用はできますか？", answer: "季節の果物やナッツは、近い特徴を持つ材料に代用できる場合があります。代用時の分量や焼き時間は、レシピ内の補足をご確認ください。" },
  { question: "レシピは無料で見られますか？", answer: "掲載されているレシピはすべて無料でご覧いただけます。季節ごとに新しいレシピを順次追加予定です。" },
  { question: "スマートフォンでも見られますか？", answer: "スマートフォン、タブレット、PCのいずれでも見やすいレスポンシブデザインで表示されます。" }
];

const recipeList = document.querySelector("#recipe-list");
const voiceList = document.querySelector("#voice-list");
const faqList = document.querySelector("#faq-list");

recipeList.innerHTML = recipes.map((recipe) => `
  <article class="recipe-card">
    <img src="${recipe.image}" alt="${recipe.title}">
    <div class="recipe-content">
      <span class="recipe-meta">${recipe.season}</span>
      <h3>${recipe.title}</h3>
      <p>${recipe.description}</p>
    </div>
  </article>
`).join("");

voiceList.innerHTML = voices.map((voice) => `
  <article class="voice-card">
    <div class="voice-card-header">
      <img src="${voice.avatar}" alt="${voice.name}">
      <div>
        <strong>${voice.name}</strong>
        <small>${voice.role}</small>
      </div>
    </div>
    <p>${voice.comment}</p>
  </article>
`).join("");

faqList.innerHTML = faqs.map((faq, index) => `
  <article class="faq-item${index === 0 ? " open" : ""}">
    <button class="faq-question" type="button" aria-expanded="${index === 0}" aria-controls="faq-answer-${index}">
      <span>${faq.question}</span>
      <span class="faq-icon" aria-hidden="true">+</span>
    </button>
    <div class="faq-answer" id="faq-answer-${index}">
      <p>${faq.answer}</p>
    </div>
  </article>
`).join("");

const setFaqHeight = (item, open) => {
  const answer = item.querySelector(".faq-answer");
  answer.style.maxHeight = open ? `${answer.scrollHeight}px` : "0px";
};

const faqItems = document.querySelectorAll(".faq-item");
faqItems.forEach((item) => {
  setFaqHeight(item, item.classList.contains("open"));

  item.querySelector(".faq-question").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const isOpen = item.classList.toggle("open");

    button.setAttribute("aria-expanded", String(isOpen));
    setFaqHeight(item, isOpen);

    faqItems.forEach((otherItem) => {
      if (otherItem !== item && otherItem.classList.contains("open")) {
        otherItem.classList.remove("open");
        otherItem.querySelector(".faq-question").setAttribute("aria-expanded", "false");
        setFaqHeight(otherItem, false);
      }
    });
  });
});
