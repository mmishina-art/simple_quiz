import { Q } from '../helpers.js';

// 英語：英検4級レベル。新しい問題は配列の最後に追加してください。
export default [
  // ---- 単語 ----
  Q('「yesterday」の意味は？', ['きのう', '明日', '今日', '毎日'], 'tomorrow = 明日、today = 今日、every day = 毎日 です。'),
  Q('「明日」を英語でいうと？', ['tomorrow', 'yesterday', 'tonight', 'today'], 'tonight = 今夜 です。'),
  Q('「airport」の意味は？', ['空港', '港', '駅', 'バス停'], 'port は「港」、air は「空」という意味です。'),
  Q('「hospital」の意味は？', ['病院', 'ホテル', '郵便局', '銀行'], 'hotel = ホテル、post office = 郵便局、bank = 銀行 です。'),
  Q('「weather」の意味は？', ['天気', '季節', '気温', '空'], 'season = 季節、temperature = 気温、sky = 空 です。'),
  Q('「famous」の意味は？', ['有名な', '大切な', 'おもしろい', 'こわい'], 'a famous singer = 有名な歌手。'),
  Q('「favorite」の意味は？', ['お気に入りの', 'きらいな', '新しい', '古い'], 'my favorite food = わたしのいちばん好きな食べ物。'),
  Q('「hungry」の意味は？', ['おなかがすいた', 'のどがかわいた', 'ねむい', 'つかれた'], 'thirsty = のどがかわいた、sleepy = ねむい、tired = つかれた です。'),
  Q('「tired」の意味は？', ['つかれた', 'うれしい', '悲しい', 'おこった'], 'happy = うれしい、sad = 悲しい、angry = おこった です。'),
  Q('「visit」の意味は？', ['訪れる', '待つ', '帰る', '出発する'], 'wait = 待つ、return = 帰る、leave = 出発する です。'),
  Q('「forget」の意味は？', ['忘れる', '覚えている', '見つける', 'なくす'], 'remember = 覚えている、find = 見つける、lose = なくす です。'),
  Q('「arrive」の意味は？', ['着く', '出発する', '走る', '止まる'], 'arrive at the station = 駅に着く。'),
  Q('「borrow」の意味は？', ['借りる', '貸す', '買う', '売る'], 'lend = 貸す、buy = 買う、sell = 売る です。'),
  Q('「dangerous」の意味は？', ['危険な', '安全な', 'かんたんな', '便利な'], 'safe = 安全な、easy = かんたんな、useful = 便利な です。'),
  Q('「easy」と反対の意味の単語は？', ['difficult', 'simple', 'happy', 'early'], 'easy = かんたんな ⇔ difficult = むずかしい です。'),
  Q('「cheap」と反対の意味の単語は？', ['expensive', 'small', 'new', 'cute'], 'cheap = 安い ⇔ expensive = 高い（ねだんが）です。'),
  Q('「early」と反対の意味の単語は？', ['late', 'fast', 'slow', 'soon'], 'early = 早い・早く ⇔ late = おそい・おそく です。'),
  Q('「third」の意味は？', ['3番目の', '3つの', '30', '13'], 'first = 1番目の、second = 2番目の、third = 3番目の です。'),
  Q('「February」の意味は？', ['2月', '11月', '12月', '1月'], 'November = 11月、December = 12月、January = 1月 です。'),
  Q('「begin」の意味は？', ['始まる・始める', '終わる', '続ける', '休む'], 'begin と start はほぼ同じ意味です。finish = 終わる。'),

  // ---- 過去形 ----
  Q('I (   ) to Kyoto last week.　（ ）に入るのは？', ['went', 'go', 'goes', 'going'], 'last week（先週）なので過去形。go の過去形は went です。'),
  Q('She (   ) tennis yesterday.　（ ）に入るのは？', ['played', 'plays', 'play', 'playing'], 'yesterday（きのう）なので過去形。play の過去形は played です。'),
  Q('Did you watch TV last night? ― Yes, I (   ).　（ ）に入るのは？', ['did', 'do', 'was', 'watched'], 'Did you ～? には Yes, I did. / No, I didn\'t. で答えます。'),
  Q('I (   ) eat breakfast this morning.（今朝、朝ごはんを食べませんでした。）　（ ）に入るのは？', ["didn't", "don't", "wasn't", "isn't"], '過去の否定文は did not（didn\'t）+ 動詞の元の形 です。'),
  Q('I (   ) busy yesterday.　（ ）に入るのは？', ['was', 'were', 'am', 'did'], 'am と is の過去形は was です。'),
  Q('They (   ) in the park an hour ago.　（ ）に入るのは？', ['were', 'was', 'are', 'did'], 'are の過去形は were です。'),
  Q('「buy（買う）」の過去形は？', ['bought', 'buyed', 'brought', 'buys'], 'buy → bought。brought は bring（持ってくる）の過去形です。'),
  Q('「see（見る）」の過去形は？', ['saw', 'seed', 'seen', 'sees'], 'see → saw です。'),
  Q('「make（作る）」の過去形は？', ['made', 'maked', 'make', 'makes'], 'make → made です。'),
  Q('「have（持っている・食べる）」の過去形は？', ['had', 'haved', 'has', 'have'], 'have → had です。'),
  Q('I was (   ) TV at eight last night.（きのうの夜8時、テレビを見ていました。）　（ ）に入るのは？', ['watching', 'watch', 'watched', 'watches'], '「〜していた」は was / were + 動詞の ing 形（過去進行形）で表します。'),
  Q('What (   ) you doing at seven? ― I was studying.　（ ）に入るのは？', ['were', 'did', 'are', 'was'], '主語が you の過去進行形なので were を使います。'),

  // ---- 未来 ----
  Q('I (   ) visit my grandmother tomorrow.　（ ）に入るのは？', ['will', 'was', 'did', 'am'], '未来のことは will + 動詞の元の形 で表します。'),
  Q("I'm going (   ) study English tonight.　（ ）に入るのは？", ['to', 'for', 'at', 'in'], '「〜するつもりです」は be going to + 動詞の元の形 です。'),
  Q('Will it be sunny tomorrow? ― No, it (   ).　（ ）に入るのは？', ["won't", "isn't", "didn't", "doesn't"], 'won\'t は will not の短い形です。'),

  // ---- 比較 ----
  Q('Ken is (   ) than Taro.（ケンはタロウより背が高い。）　（ ）に入るのは？', ['taller', 'tall', 'tallest', 'more tall'], '「〜より…」は 形容詞 + er + than で表します。'),
  Q('This is the (   ) dog in the town.（町でいちばん大きい犬）　（ ）に入るのは？', ['biggest', 'bigger', 'big', 'most big'], '「いちばん〜」は the + 形容詞 + est です。big は g を重ねて biggest になります。'),
  Q('This book is (   ) interesting than that one.　（ ）に入るのは？', ['more', 'most', 'very', 'much'], 'interesting のような長い単語は、more をつけて比較級にします。'),
  Q('Tom runs as (   ) as Ken.（トムはケンと同じくらい速く走ります。）　（ ）に入るのは？', ['fast', 'faster', 'fastest', 'more fast'], '「〜と同じくらい…」は as + 元の形 + as です。'),
  Q('「good（よい）」の比較級は？', ['better', 'gooder', 'best', 'more good'], 'good → better → best と形が変わります。'),
  Q('Which do you like (   ), dogs or cats? ― I like cats.　（ ）に入るのは？', ['better', 'good', 'well', 'best'], '2つをくらべて「どちらが好きか」は like ～ better で表します。'),

  // ---- 不定詞・動名詞 ----
  Q('I want (   ) be a doctor.（わたしは医者になりたいです。）　（ ）に入るのは？', ['to', 'for', 'at', 'with'], '「〜したい」は want to + 動詞の元の形 です。'),
  Q('I enjoyed (   ) with my friends.　（ ）に入るのは？', ['talking', 'talk', 'to talk', 'talked'], 'enjoy のあとには、動詞の ing 形が来ます。'),
  Q('He finished (   ) the book.　（ ）に入るのは？', ['reading', 'read', 'to read', 'reads'], 'finish のあとには、動詞の ing 形が来ます。'),
  Q('I went to the library (   ) study.（勉強するために図書館に行きました。）　（ ）に入るのは？', ['to', 'for', 'and', 'but'], '「〜するために」は to + 動詞の元の形 で表します。'),
  Q('How (   ) going to the zoo?（動物園に行くのはどう？）　（ ）に入るのは？', ['about', 'for', 'many', 'old'], 'How about ～ing? で「〜するのはどうですか」とさそいます。'),

  // ---- There is / 助動詞 ----
  Q('There (   ) a cat under the table.　（ ）に入るのは？', ['is', 'are', 'am', 'be'], 'There is + 1つのもの、There are + 2つ以上のもの で「〜があります」です。'),
  Q('There (   ) many books in the library.　（ ）に入るのは？', ['are', 'is', 'am', 'was'], 'many books と複数なので are を使います。'),
  Q('You (   ) do your homework.（宿題をしなければなりません。）　（ ）に入るのは？', ['must', 'can', 'may', 'will'], '「〜しなければならない」は must です。'),
  Q('I (   ) to go home now.（もう家に帰らなければなりません。）　（ ）に入るのは？', ['have', 'must', 'will', 'can'], 'have to + 動詞の元の形 も「〜しなければならない」という意味です。'),
  Q('(   ) I use your pen? ― Sure.（ペンを使ってもいいですか。）　（ ）に入るのは？', ['May', 'Must', 'Is', 'Was'], 'May I ～? で「〜してもいいですか」とていねいにたずねます。'),
  Q('(   ) I open the window? ― Yes, please.（まどを開けましょうか。）　（ ）に入るのは？', ['Shall', 'Will', 'Did', 'Was'], 'Shall I ～? で「（わたしが）〜しましょうか」と申し出ます。'),

  // ---- 前置詞・接続詞・代名詞 ----
  Q("I'm looking (   ) my key.（かぎをさがしています。）　（ ）に入るのは？", ['for', 'at', 'on', 'to'], 'look for ～ = 〜をさがす、look at ～ = 〜を見る です。'),
  Q('He is good (   ) swimming.（かれは泳ぐのが得意です。）　（ ）に入るのは？', ['at', 'in', 'on', 'for'], 'be good at ～ で「〜が得意だ」という意味です。'),
  Q('Thank you (   ) your help.　（ ）に入るのは？', ['for', 'to', 'at', 'of'], 'Thank you for ～ で「〜をありがとう」です。'),
  Q("I'm interested (   ) music.（音楽に興味があります。）　（ ）に入るのは？", ['in', 'on', 'at', 'with'], 'be interested in ～ で「〜に興味がある」です。'),
  Q('I went to bed early (   ) I was tired.　（ ）に入るのは？', ['because', 'but', 'or', 'so'], '「つかれていたので」と理由を表すときは because を使います。'),
  Q('I was tired, (   ) I went to bed early.　（ ）に入るのは？', ['so', 'because', 'or', 'if'], '「だから」と結果を表すときは so を使います。'),
  Q('Please give (   ) some water.（わたしに水をください。）　（ ）に入るのは？', ['me', 'I', 'my', 'mine'], '「わたしに」は me です。'),

  // ---- 会話 ----
  Q('「What\'s wrong?」と聞かれたときの返事として合うものは？', ['I have a headache.', "I'm eleven.", "It's sunny.", "You're welcome."], 'What\'s wrong? は「どうしたの？」。headache = 頭痛 です。'),
  Q('お店で「May I help you?」と言われたときの返事として合うものは？', ["Yes, I'm looking for a T-shirt.", "No, I'm not hungry.", 'Yes, I can swim.', "It's on the desk."], 'May I help you? は店員さんの「いらっしゃいませ（何かおさがしですか）」です。'),
  Q('「How was your trip?」への答えは？', ['It was great.', 'I went by train.', 'Next Sunday.', 'With my family.'], 'How was ～? は「〜はどうでしたか」と感想をたずねる言い方です。'),
  Q('「Would you like some tea?」への答えは？', ['Yes, please.', 'Yes, I would like.', 'No, I am.', "It's mine."], 'Would you like ～? は「〜はいかがですか」。Yes, please. / No, thank you. で答えます。'),
  Q('「How long does it take?」への答えは？', ['About ten minutes.', 'Ten meters.', 'By bus.', 'At ten.'], 'How long does it take? は「どのくらい時間がかかりますか」です。'),
  Q('「Why do you study English?」への答えは？', ['Because I want to go to America.', 'Yes, I do.', 'Every day.', 'At school.'], 'Why（なぜ）とたずねられたら、Because ～ で理由を答えます。'),
  Q('「Have a nice day!」と言われたときの返事は？', ['You, too.', "I'm sorry.", 'Me, neither.', "You're welcome."], '「あなたもね」という意味で You, too. と返します。'),
  Q('「Can I speak to Mr. Brown?」（電話で）の意味は？', ['ブラウンさんをお願いします', 'ブラウンさんと話せません', 'ブラウンさんと話したことがあります', 'ブラウンさんに会いました'], '電話で相手を呼び出すときの言い方です。'),
  Q('「Let\'s go shopping.」への返事として合うものは？', ["That's a good idea.", 'Here you are.', "I'm fine, thank you.", 'Nice to meet you.'], 'That\'s a good idea. は「それはいい考えだね」です。'),
];
