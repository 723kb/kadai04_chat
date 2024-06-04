import firebaseConfig from "./firebaseApikey.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, set, onChildAdded, remove, onChildRemoved, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, "chat");

export { dbRef };

// メモをリストに追加する関数をエクスポート
// isJapanese 日本語のメモかどうかを判定するためのパラメーター名
export const addMemoToList = (list, title, text, isJapanese, timestamp) => {
  const li = $('<li></li>').addClass('w-full flex mb-4');
  // const timestamp = Date.now(); // メッセージを判別するために、現在のタイムスタンプを取得
  // タイムスタンプを使用して日時をフォーマット
  let date = new Date(timestamp);
  let y = date.getFullYear();
  let m = ('0' + (date.getMonth() + 1)).slice(-2);
  let d = ('0' + date.getDate()).slice(-2);
  let h = ('0' + date.getHours()).slice(-2);
  let min = ('0' + date.getMinutes()).slice(-2);
  let formattedDate = y + '/' + m + '/' + d + ' ' + h + ':' + min;

  if (isJapanese) { // isJapaneseがtrueなら、日本語のメモを追加
    li.html(`
      <div class="chat-bubble right" data-timestamp="${timestamp}"> 
        <h3>${title}</h3>
        <p>日本語: <span class='jp-text'>${text}</span></p>
        <p>${formattedDate}</p>
      </div>
    `);
  } else { // isJapaneseがfalseなら、中国語のメモを追加
    li.html(`
      <div class="chat-bubble left " data-timestamp="${timestamp}">
        <h3>${title}</h3>
        <p>中国語: <span class='cn-text'>${text}</span></p>
        <p>${formattedDate}</p>
      </div>
    `);
  }

  list.append(li);

  // 追加した投稿の位置までページをスクロールする
  const scrollTo = li.offset().top;
  $('html, body').animate({
    scrollTop: scrollTo
  }, 500); // 0.5秒かけてスクロール
};

// メモを保存する関数をエクスポート
export const saveMemo = async () => {
  // console.log('saveMemo 関数が呼び出されました');
  const title = $('#title').val();
  const text = $('#text').val(); // タイトルと本文を取得

  if (title && text) { // タイトルと本文が入力されている場合のみ処理を行う
    try {
      const translatedText = await translateText(text); // テキストを翻訳
      const timestamp = Date.now(); // 現在のタイムスタンプを取得
      const newMemoRef = push(dbRef); // データベースの新しい参照を作成
      set(newMemoRef, { // タイトル、本文、翻訳済みテキスト、タイムスタンプをデータベースに保存
        title: title,
        text: text,
        translatedText: translatedText,
        timestamp: timestamp
      });

      // 日本語のメッセージをリストに追加し、即時表示
      addMemoToList($('#list'), title, text, true, timestamp); // addMemoToListに渡されるisJapaneseがtrueの場合
      // 一定時間後に中国語のメッセージを表示
      setTimeout(() => {
        addMemoToList($('#list'), title, translatedText, false, timestamp); // addMemoToListに渡されるisJapaneseがfalseの場合
      }, 2000); // 2000ミリ秒（2秒）後に表示
      $('#title').val('');
      $('#text').val('');
    } catch (error) {
      console.error('Error translating text:', error);
    }
  }
};

// データベースを読み込み、リストに表示する関数をエクスポート
export const loadMemos = () => {
  $('#list').empty(); // 読み込み時に既存のメモが重複して表示しないよう、リストを空にする
  // データベースからデータ取得が成功した場合
  get(dbRef).then((snapshot) => { // getメソッドの結果として返されるのがsnapshotオブジェクト
    const messages = [];
    snapshot.forEach((childSnapshot) => { // 取得したデータを1つずつ処理 各子ノードがchildSnapshot
      const childData = childSnapshot.val(); // データを取得 childSnapshotはメモそのもの childDataはメモ内容をJSON形式で返すもの
      messages.push(childData); // 配列に追加
    });

    // 配列内の要素をタイムスタンプ順にソート
    // a.timestampとb.timestampを比較 正の値を返すとaがbの後ろに 負の値を返すとaがbの前に並ぶ
    messages.sort((a, b) => a.timestamp - b.timestamp); // 比較関数 timestampが小さい(古い)順に並び替え

    messages.forEach((message) => { // 各メッセージに対して以下実行
      addMemoToList($('#list'), message.title, message.text, true, message.timestamp); // 日本語のメッセージをリストに追加
      addMemoToList($('#list'), message.title, message.translatedText, false, message.timestamp); // 中国語のメッセージをリストに追加
    });
  }).catch(error => {
    console.error('データベースからメッセージを取得中にエラーが発生しました:', error);
  });
};