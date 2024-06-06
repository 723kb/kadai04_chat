import firebaseConfig from "./firebaseApikey.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, set, remove, get, child } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"; // Realtime Database用の関数をインポートする

// Your web app's Firebase configuration
console.log(firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app); //RealtimeDBに接続
const dbRef = ref(db, "chat"); //RealtimeDB内の"chat"を使う
// ここまでFirebaseへの接続

// メモが読み込まれたかどうかを示すフラグ
let memosLoaded = false; //これがないとリロードのたびにloadMemosが読み込まれてしまう

$(document).ready(() => {
  // 使い方説明のtoggleメソッド
  // 最初は非表示にする
  $('#toggleDiv').hide();
  $('#toggleButton').click(() => {
    $('#toggleDiv').slideToggle();
  });

  // memosLoadedがfalseの場合のみloadMemosを呼び出す
  if (!memosLoaded) {  //最初はfalse設定 読み込み時に$(document).ready(() => {の内容に入り、loadMemosが呼び出される
    loadMemos();
    // console.log(memosLoaded, 'メモが読まれたか');
    // memosLoadedをtrueに設定して、loadMemosが1回だけ実行されるようにする
    memosLoaded = true; //ここでtrue判定になるのでリロードしてもloadMemosは呼び出されない
  }
  // console.log(memosLoaded, 'メモが読まれたか');

  // フィルタリング機能説明のtoggleメソッド
  $("#filterArea").hide();
  $("#search").on("click", () => {
    $("#filterArea").slideToggle();
  });
});

// メモをリストに追加する関数
// isJapanese 日本語のメモかどうかを判定するためのパラメーター名
// shouldScroll = falseはスクロールが必要か判断するオプション
const addMemoToList = (list, text, isJapanese, timestamp, key, shouldScroll = false) => {
  const li = $('<li></li>').addClass('w-full flex mb-4').attr('data-key', key);
  // const timestamp = Date.now(); // メッセージを判別するために、現在のタイムスタンプを取得
  // タイムスタンプを使用して日時をフォーマット
  let date = new Date(timestamp);
  let y = date.getFullYear();
  let m = ('0' + (date.getMonth() + 1)).slice(-2);
  let d = ('0' + date.getDate()).slice(-2);
  let h = ('0' + date.getHours()).slice(-2);
  let min = ('0' + date.getMinutes()).slice(-2);
  let formattedDate = y + '/' + m + '/' + d + ' ' + h + ':' + min;

  // console.log(isJapanese, '日本語かどうか');
  if (isJapanese) { // isJapaneseがtrueなら、日本語のメモを追加
    li.html(`
      <div class="chat-bubble right" data-timestamp="${timestamp}"> 
        <h3>日本語 : </h3>
        <p class='jp-text'>${text}</p>
        <div class="timestamp">
        <p>${formattedDate}</p>
        <button class="delete-memo">
          <i class="fa-regular fa-trash-can"></i>
        </button>
        </div>
      </div>
    `);
  } else { // isJapaneseがfalseなら、中国語のメモを追加
    li.html(`
      <div class="chat-bubble left " data-timestamp="${timestamp}">
        <h3>中国語 : </h3>
        <p class='cn-text'>${text}</p>
        <p class="text-end">${formattedDate}</p>
        <button class="speak-memo">
          <i class="fa fa-volume-up"></i>
        </button>
      </div>
    `);
  }

  list.append(li);

  // 投稿時のみ追加した投稿の位置までページをスクロールする
  if (shouldScroll) { // shouldScrollがtrueの時のみ実行
    const scrollTo = li.offset().top;
    $('html, body').animate({
      scrollTop: scrollTo
    }, 1000);
  }

  // 削除ボタンのクリックイベント(各日本語メッセージの削除)
  li.find('.delete-memo').on('click', function () {  // アロー関数にするとthisが機能しない!!
    const key = $(this).closest('li').data('key'); // クリックされた削除ボタンの親要素liを取得
    // console.log(key)
    remove(child(dbRef, key)); // キーに対応するメモをデータベースから削除
    $(this).closest('li').remove(); // クリックされた削除ボタンの親要素liをリストから削除
    $(`[data-key="${key}-cn"]`).remove(); // 削除したメモのキーと-cn属性を持つ要素を削除(連動して消える)
  });

  // スピーカーボタンのクリックイベント
  li.find('.speak-memo').on('click', function () {
    // クリックされたボタンと同じ要素を持つ中国語のメッセージを取得
    const textToSpeak = $(this).siblings('.cn-text').text();
    speakText(textToSpeak);
  });
};

// メモを音読する関数
const speakText = (text) => {
  // ブラウザがWeb Speech APIのspeechSynthesisに対応しているかを確認
  if ('speechSynthesis' in window) {
    // 音声合成用のUtteranceオブジェクトを作成
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; // 中国語に設定
    // テキストを音声で読み上げる
    speechSynthesis.speak(utterance);
  } else {
    // ブラウザが音声合成に対応していない場合の処理
    alert('このブラウザは音声合成に対応していません。');
  }
};

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

// メモを保存する関数
const saveMemo = async () => {
  // console.log('saveMemo 関数が呼び出されました');
  const text = $('#text').val(); // タイトルと本文を取得

  if (text) { // 本文が入力されている場合のみ実行
    try {
      const translatedText = await translateText(text); // テキストを翻訳
      const timestamp = Date.now(); // 現在のタイムスタンプを取得
      const newMemoRef = push(dbRef); // データベースの新しい参照を作成
      const key = newMemoRef.key; // 新しいメモのキーを取得
      set(newMemoRef, { // 本文、翻訳済みテキスト、タイムスタンプをデータベースに保存
        text: text,
        translatedText: translatedText,
        timestamp: timestamp  // すでにnewMemoRefにはキーを含んだノード参照になっているので、keyは渡さない
      });

      // 日本語のメッセージをリストに追加し、即時表示
      // addMemoToListに渡されるisJapaneseがtrueの場合
      addMemoToList($('#list'), text, true, timestamp, key, true); // 2つめのtrueは投稿時にスクロールするフラグ
      // 一定時間後に中国語のメッセージを表示
      setTimeout(() => {
        // addMemoToListに渡されるisJapaneseがfalseの場合
        addMemoToList($('#list'), translatedText, false, timestamp, `${key}-cn`, true); // 2つめのtrueは投稿時にスクロールするフラグ
      }, 2000); // 2000ミリ秒（2秒）後に表示
      $('#text').val('');
    } catch (error) {
      console.error('Error translating text:', error);
    }
  }
};

// saveクリックイベント
$('#save').on('click', saveMemo);

// EnterKeyで保存
$(document).on('keypress', (e) => {
  if (e.which == 13) {
    saveMemo();
  }
});

// clearクリックイベント
$('#clear').on('click', () => {
  // 確認メッセージを表示し、OKが押された場合のみ削除を実行
  if (confirm("本当に削除しますか？")) {
    remove(dbRef); // データベースからデータを削除
    $('#list').empty(); // listの中身を空にする
  }
});

// データベースを読み込み、リストに表示する関数
const loadMemos = () => {

  // データベースからデータ取得が成功した場合
  get(dbRef).then((snapshot) => { // getメソッドの結果として返されるのがsnapshot(状態の写し)オブジェクト
    $('#list').empty(); // メッセージを表示する前にリストを空にする = 重複表示しない
    const messages = [];
    snapshot.forEach((childSnapshot) => { // 取得したデータを1つずつ処理 各子ノードがchildSnapshot
      const childData = childSnapshot.val(); // データを取得 childSnapshotはメモそのもの childDataはメモ内容をJSON形式で返すもの
      const key = childSnapshot.key; // 各メモのキーを取得
      messages.push({ key, ...childData }); // 配列に追加 スプレッド構文でchildDataのプロパティを展開
    });

    // 配列内の要素をタイムスタンプ順にソート
    // a.timestampとb.timestampを比較 正の値を返すとaがbの後ろに 負の値を返すとaがbの前に並ぶ
    messages.sort((a, b) => a.timestamp - b.timestamp); // 比較関数 timestampが小さい(古い)順に並び替え

    messages.forEach((message) => { // 各メッセージに対して以下実行
      addMemoToList($('#list'), message.text, true, message.timestamp, message.key); // 日本語のメッセージをリストに追加
      addMemoToList($('#list'), message.translatedText, false, message.timestamp, `${message.key}-cn`); // 中国語のメッセージをリストに追加
    });
  }).catch(error => {
    console.error('データベースからメッセージを取得中にエラーが発生しました:', error);
  });
};

// 検索ボタンがクリックされた時の処理
$('#searchButton').on('click', () => {
  const filter = $('#filter').val().toLowerCase(); // フィルター入力欄の値を取得→大文字と小文字の区別をなくす
  $('#list').empty(); // フィルタリング結果のみを表示するためにリストを空にする
  get(dbRef).then((snapshot) => {
    let hasMatchingMemos = false; // フラグを追加
    snapshot.forEach((childSnapshot) => { // 取得したテータをここのメモに分割して処理
      const childData = childSnapshot.val();
      const key = childSnapshot.key; // 各メモのキーを取得
      if (childData.text.toLowerCase().includes(filter)) { // タイトルが入力された値を含む場合のみ以下の処理
        hasMatchingMemos = true; // フラグをtrueに設定
        addMemoToList($('#list'), childData.text, true, childData.timestamp, key); // 日本語メッセージ
        addMemoToList($('#list'), childData.translatedText, false, childData.timestamp, `${key}-cn`); // 中国語メッセージ
      }
    });
    // フィルターに一致するメモがない場合の処理を追加
    if (!hasMatchingMemos) {
      const li = $('<li></li>').addClass('w-full flex mb-4');
      li.html('<div>検索に一致するメモはありません</div>');
      $('#list').append(li);
    }
  })
    .catch((error) => {
      console.error('データベースからメッセージを取得中にエラーが発生しました:', error);
    });
  // フィルター入力欄を空にする処理
  $('#filterClear').on('click', () => {
    $('#filter').val(''); // フィルター入力欄を空にする
    loadMemos(); // メモを再度読み込む
    // console.log(memosLoaded, 'メモが読まれたか');
    $('#list').empty(); // リストを空にする
  });
});

// わからなかったこと つまずいたところ
// snapshot childSnapshot 
// sortメソッド 引数として比較関数を受け取る
// isJapaneseはパラメーター名なので関数呼び出し時には具体的な値を指定する必要がある(loadMemos)
// アロー関数 thisが参照できないのはなぜか→アロー関数で書くと外部スコープのthis(windowオブジェクトなど)を指すから。

// 関数まとめ
// child 参照から子への参照を取得するための関数
// get データベースからデータを取得するための関数
// getDatabase データベースへの参照を取得するための関数