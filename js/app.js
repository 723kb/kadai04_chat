// firebase.jsからインポート
import { addMemoToList,saveMemo, loadMemos, dbRef } from './firebase.js'; 

$(document).ready(() => {
  // 使い方説明のtoggleメソッド
// 最初は非表示にする
$('#toggleDiv').hide();
$('#toggleButton').click(() => {
  $('#toggleDiv').slideToggle();
});

// フィルタリング機能説明のtoggleメソッド
$("#filter").hide();
$("#search").on("click", () => {
  $("#filter").slideToggle();
});

// メモが読み込まれたかどうかを示すフラグ
let memosLoaded = false; //これがないとリロードのたびにloadMemosが読み込まれてしまう

  // メモの読み込み
  // memosLoadedがfalseの場合のみloadMemosを呼び出す
  if (!memosLoaded) {  //最初はfalse設定 読み込み時に$(document).ready(() => {の内容に入り、loadMemosが呼び出される
    loadMemos();
    // memosLoadedをtrueに設定して、loadMemosが1回だけ実行されるようにする
    memosLoaded = true; //ここでtrue判定になるのでリロードしてもloadMemosは呼び出されない
  }
});

addMemoToList();

// MyMemory APIを使って指定されたテキストを翻訳する関数
const translateText = async (text) => {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ja|zh-CN`;
  try {
    const response = await fetch(url); // APIリクエストを送信し、レスポンスを取得 
    const data = await response.json(); // レスポンスをJSON形式に変換
    return data.responseData.translatedText; // 翻訳されたテキストを返す
  } catch (error) {
    console.error('Error translating text:', error); // エラーハンドリング
    throw error; //throw文 この関数が呼び出されている他の関数にエラーが起きていることを知らせる
  }
};

// フィルタ入力欄で入力があった時の処理
$('#filter').on('input', () => {
  const filter = $('#filter').val().toLowerCase(); // フィルター入力欄の値を取得→大文字と小文字の区別をなくす
  $('#list').empty(); // フィルタリング結果のみを表示するためにリストを空にする
  get(dbRef).then((snapshot) => {
    snapshot.forEach((childSnapshot) => { // 取得したテータをここのメモに分割して処理
      const childData = childSnapshot.val();
      if (childData.title.toLowerCase().includes(filter)) { // タイトルが入力された値を含む場合のみ以下の処理
        addMemoToList($('#list'), childData.title, childData.text, childData.timestamp); // 日本語のメッセージを追加
        addMemoToList($('#list'), childData.title, childData.translatedText, childData.timestamp); // 翻訳された中国語を追加
      }
    });
  });
});

// 調べることsnapshot childSnapshot get関数
// sortメソッド 引数として比較関数を受け取る
// 比較関数
// isJapaneseはパラメーター名なので関数呼び出し時には具体的な値を指定する必要がある(loadMemos)