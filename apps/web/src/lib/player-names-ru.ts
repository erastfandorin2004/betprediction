/** Известные игроки: оригинальное имя → русское написание */
const KNOWN: Record<string, string> = {
  // Бразилия
  'Vinicius Junior': 'Винисиус Жуниор',
  'Rodrygo': 'Родриго',
  'Neymar': 'Неймар',
  'Marquinhos': 'Маркиньос',
  'Alisson': 'Алиссон',
  'Casemiro': 'Каземиро',
  'Raphinha': 'Рафинья',
  'Lucas Paquetá': 'Лукас Пакета',
  'Gabriel Martinelli': 'Габриэль Мартинелли',
  'Endrick': 'Эндрик',
  'Danilo': 'Данило',
  'Militão': 'Милитао',
  'Éder Militão': 'Эдер Милитао',
  'Antony': 'Антони',
  'Fred': 'Фред',
  'Thiago Silva': 'Тиаго Силва',
  'Ederson': 'Эдерсон',
  'Gabriel Jesus': 'Габриэль Жезус',
  'Richarlison': 'Ришарлисон',

  // Аргентина
  'Lionel Messi': 'Лионель Месси',
  'Ángel Di María': 'Анхель Ди Мария',
  'Paulo Dybala': 'Пауло Дибала',
  'Lautaro Martínez': 'Лаутаро Мартинес',
  'Julián Álvarez': 'Хулиан Альварес',
  'Emiliano Martínez': 'Эмилиано Мартинес',
  'Rodrigo De Paul': 'Родриго Де Пауль',
  'Leandro Paredes': 'Леандро Паредес',
  'Nicolás Otamendi': 'Николас Отаменди',
  'Lisandro Martínez': 'Лисандро Мартинес',
  'Alexis Mac Allister': 'Алексис Мак Аллистер',
  'Enzo Fernández': 'Энсо Фернандес',
  'Nahuel Molina': 'Науэль Молина',
  'Germán Pezzella': 'Херман Песелла',

  // Франция
  'Kylian Mbappé': 'Килиан Мбаппе',
  'Antoine Griezmann': 'Антуан Гризманн',
  'Ousmane Dembélé': 'Усман Дембеле',
  'Marcus Thuram': 'Маркус Тюрам',
  'N\'Golo Kanté': 'Нголо Канте',
  'Aurélien Tchouaméni': 'Орельен Тчуамени',
  'Mike Maignan': 'Майк Меньян',
  'William Saliba': 'Уильям Салиба',
  'Raphaël Varane': 'Рафаэль Варан',
  'Lucas Hernandez': 'Лукас Эрнандес',
  'Theo Hernandez': 'Тео Эрнандес',
  'Kingsley Coman': 'Кингсли Коман',
  'Benjamin Pavard': 'Бенжамин Паван',
  'Jules Koundé': 'Жюль Кунде',
  'Eduardo Camavinga': 'Эдуардо Камавинга',
  'Adrien Rabiot': 'Адриен Рабьо',

  // Германия
  'Manuel Neuer': 'Мануэль Нойер',
  'Toni Kroos': 'Тони Кроос',
  'Kai Havertz': 'Кай Хаверц',
  'Leroy Sané': 'Лерой Сане',
  'Thomas Müller': 'Томас Мюллер',
  'Joshua Kimmich': 'Йозуа Киммих',
  'Jamal Musiala': 'Джамал Мусиала',
  'Florian Wirtz': 'Флориан Вирц',
  'Leon Goretzka': 'Леон Горецка',
  'Antonio Rüdiger': 'Антонио Рюдигер',
  'Robert Andrich': 'Роберт Андрих',
  'İlkay Gündoğan': 'Ильки Гюндоган',
  'Marc-André ter Stegen': 'Марк-Андре тер Штеген',
  'David Raum': 'Давид Раум',
  'Serge Gnabry': 'Серж Гнабри',
  'Chris Führich': 'Крис Фюрих',

  // Испания
  'Pedri': 'Педри',
  'Gavi': 'Гави',
  'Ansu Fati': 'Ансу Фати',
  'Ferran Torres': 'Ферран Торрес',
  'Dani Olmo': 'Дани Ольмо',
  'Lamine Yamal': 'Ламин Ямаль',
  'Nico Williams': 'Нико Уильямс',
  'Unai Simón': 'Унай Симон',
  'Alejandro Balde': 'Алехандро Бальде',
  'Pau Cubarsí': 'Пау Кубарси',
  'Robin Le Normand': 'Робин Ле Норман',
  'Mikel Merino': 'Микель Мерино',
  'Fabián Ruiz': 'Фабиан Руис',
  'Álvaro Morata': 'Альваро Мората',
  'Rodri': 'Родри',
  'David Raya': 'Давид Райя',
  'Nacho': 'Начо',

  // Португалия
  'Cristiano Ronaldo': 'Криштиану Роналду',
  'Bruno Fernandes': 'Бруну Фернандеш',
  'Bernardo Silva': 'Бернарду Силва',
  'Rafael Leão': 'Рафаэль Леао',
  'João Cancelo': 'Жуан Канселу',
  'João Félix': 'Жуан Феликс',
  'Diogo Jota': 'Диого Жота',
  'Rúben Dias': 'Рубен Диаш',
  'Pepe': 'Пепе',
  'Gonçalo Ramos': 'Гонсалу Рамуш',
  'Diogo Dalot': 'Диого Далот',
  'Rúben Neves': 'Рубен Невеш',
  'William Carvalho': 'Уильям Карвальо',
  'Vitinha': 'Витинья',
  'Pedro Neto': 'Педру Нету',

  // Англия
  'Harry Kane': 'Харри Кейн',
  'Jude Bellingham': 'Джуд Беллингем',
  'Bukayo Saka': 'Букайо Сака',
  'Phil Foden': 'Фил Фоден',
  'Marcus Rashford': 'Маркус Рэшфорд',
  'Jordan Pickford': 'Джордан Пикфорд',
  'Declan Rice': 'Деклан Райс',
  'Jack Grealish': 'Джек Грилиш',
  'Trent Alexander-Arnold': 'Трент Александер-Арнольд',
  'Kyle Walker': 'Кайл Уокер',
  'John Stones': 'Джон Стоунз',
  'Luke Shaw': 'Люк Шоу',
  'Kieran Trippier': 'Кьеран Триппьер',
  'Kobbie Mainoo': 'Кобби Майну',
  'Cole Palmer': 'Коул Палмер',

  // Нидерланды
  'Virgil van Dijk': 'Вирхил ван Дейк',
  'Memphis Depay': 'Мемфис Депай',
  'Frenkie de Jong': 'Френки де Йонг',
  'Xavi Simons': 'Хави Симонс',
  'Cody Gakpo': 'Коди Гакпо',
  'Stefan de Vrij': 'Стефан де Врей',
  'Daley Blind': 'Дейли Блинд',
  'Denzel Dumfries': 'Денсел Думфрис',
  'Nathan Aké': 'Натан Аке',
  'Georginio Wijnaldum': 'Джорджиньо Вейналдум',
  'Teun Koopmeiners': 'Тёйн Копмейнерс',
  'Ryan Gravenberch': 'Раян Хравенберх',
  'Tijjani Reijnders': 'Тийяни Рейндерс',

  // Бельгия
  'Kevin De Bruyne': 'Кевин Де Брёйне',
  'Romelu Lukaku': 'Ромелу Лукаку',
  'Eden Hazard': 'Эден Азар',
  'Thibaut Courtois': 'Тибо Куртуа',
  'Jan Vertonghen': 'Ян Вертонген',
  'Toby Alderweireld': 'Тоби Алдервейрелд',
  'Yannick Carrasco': 'Янник Каррашку',
  'Axel Witsel': 'Аксель Витсель',
  'Dries Mertens': 'Дрис Мертенс',
  'Charles De Ketelaere': 'Шарль Де Кетеларе',
  'Leandro Trossard': 'Леандро Тросар',
  'Youri Tielemans': 'Юри Тилеманс',
  'Arthur Theate': 'Артюр Тет',
  'Amadou Onana': 'Амаду Онана',
  'Jeremy Doku': 'Жереми Доку',

  // Мексика
  'Hirving Lozano': 'Ирвинг Лосано',
  'Guillermo Ochoa': 'Гильермо Очоа',
  'Raúl Jiménez': 'Рауль Хименес',
  'Edson Álvarez': 'Эдсон Альварес',
  'Héctor Herrera': 'Эктор Эррера',
  'Carlos Vela': 'Карлос Вела',
  'Andrés Guardado': 'Андрес Гуардадо',
  'Jesús Gallardo': 'Хесус Гальярдо',
  'Santiago Giménez': 'Сантьяго Хименес',
  'Alexis Vega': 'Алексис Вега',

  // США
  'Christian Pulisic': 'Кристиан Пулишич',
  'Gio Reyna': 'Джо Рейна',
  'Tyler Adams': 'Тайлер Адамс',
  'Weston McKennie': 'Уэстон МакКени',
  'Matt Turner': 'Мэтт Тёрнер',
  'Sergino Dest': 'Серхиньо Дест',
  'Ricardo Pepi': 'Рикардо Пепи',
  'Josh Sargent': 'Джош Сарджент',
  'Yunus Musah': 'Юнус Муса',
  'Brenden Aaronson': 'Брэнден Аронсон',
  'Tim Weah': 'Тим Уэа',

  // Канада
  'Alphonso Davies': 'Альфонсо Дэвис',
  'Jonathan David': 'Джонатан Давид',
  'Tajon Buchanan': 'Тэйджон Бьюкенен',
  'Milan Borjan': 'Милан Борян',

  // Марокко
  'Achraf Hakimi': 'Ашраф Хакими',
  'Hakim Ziyech': 'Хаким Зиеш',
  'Romain Saïss': 'Ромен Саисс',
  'Sofyan Amrabat': 'Суфьян Амрабат',
  'Yassine Bounou': 'Ясин Буну',
  'Youssef En-Nesyri': 'Юсеф Эн-Несири',
  'Noussair Mazraoui': 'Нусайр Мазрауи',
  'Azzedine Ounahi': 'Аззедин Унахи',
  'Nayef Aguerd': 'Найеф Агерд',
  'Sofiane Boufal': 'Суфьян Буфаль',

  // Япония
  'Takumi Minamino': 'Такуми Минамино',
  'Daichi Kamada': 'Дайти Камада',
  'Ritsu Doan': 'Рицу Доан',
  'Kaoru Mitoma': 'Каору Митома',
  'Wataru Endo': 'Ватару Эндо',
  'Maya Yoshida': 'Майя Ёсида',
  'Hidemasa Morita': 'Хидэмаса Морита',
  'Takehiro Tomiyasu': 'Такэхиро Томиясу',
  'Shuichi Gonda': 'Сюити Гонда',

  // Южная Корея
  'Son Heung-min': 'Сон Хын Мин',
  'Lee Kang-in': 'Ли Ган Ин',
  'Kim Min-jae': 'Ким Мин Чжэ',
  'Hwang Hee-chan': 'Хван Хи Чхан',
  'Cho Gue-sung': 'Чо Гю Сон',
  'Kim Seung-gyu': 'Ким Сын Гю',
  'Seung-Gyu Kim': 'Ким Сын Гю',
  'Hwang In-beom': 'Хван Ин Бом',
  'In-beom Hwang': 'Хван Ин Бом',
  'Oh Hyeon-gyu': 'О Хён Гю',
  'Hyun-Gyu Oh': 'О Хён Гю',
  'Lee Jae-sung': 'Ли Чже Сон',
  'Jae-sung Lee': 'Ли Чже Сон',
  'Kwon Chang-hoon': 'Квон Чхан Хун',
  'Kim Young-gwon': 'Ким Ён Гвон',
  'Bum-keun Song': 'Сон Бом Гын',
  'Hyeon-woo Jo': 'Чо Хён У',
  'Moon-hwan Kim': 'Ким Мун Хван',
  'Yu-min Cho': 'Чо Ю Мин',
  'Han-bum Lee': 'Ли Хан Бом',
  'Young-woo Seol': 'Соль Ён У',
  'Tae-hyeon Kim': 'Ким Тхэ Хён',
  'Tae-seok Lee': 'Ли Тхэ Сок',
  'Dong-gyeong Lee': 'Ли Тон Гён',
  'Hyun-jun Yang': 'Ян Хён Чжун',
  'Jin-Gyu Kim': 'Ким Чин Гю',
  'Seung-Ho Paik': 'Пэк Сын Хо',
  'Kang-in Lee': 'Ли Ган Ин',
  'Jin-seob Park': 'Пак Чин Соп',
  'Gi-hyuk Lee': 'Ли Ги Хёк',
  'Gue-Sung Cho': 'Чо Гю Сон',
  'Ji-sung Eom': 'Ом Чжи Сон',
  'Heung-min Son': 'Сон Хын Мин',
  'Joon-ho Bae': 'Пэ Чун Хо',

  // Иран
  'Mehdi Taremi': 'Мехди Тареми',
  'Sardar Azmoun': 'Сардар Азмун',
  'Alireza Jahanbakhsh': 'Алиреза Джаханбахш',
  'Ali Karimi': 'Али Каими',

  // Австралия
  'Mat Ryan': 'Мэт Райан',
  'Harry Souttar': 'Гарри Саттар',
  'Mitchell Duke': 'Митчелл Дюк',
  'Aaron Mooy': 'Аарон Муй',
  'Martin Boyle': 'Мартин Бойл',
  'Mathew Leckie': 'Мэтью Лекки',

  // Сенегал
  'Sadio Mané': 'Садио Мане',
  'Kalidou Koulibaly': 'Калиду Кулибали',
  'Édouard Mendy': 'Эдуар Менди',
  'Idrissa Gueye': 'Идрисса Гей',

  // Швейцария
  'Xherdan Shaqiri': 'Кшерджан Шакири',
  'Granit Xhaka': 'Гранит Джака',
  'Yann Sommer': 'Ян Зоммер',
  'Haris Seferovic': 'Харис Сеферович',
  'Breel Embolo': 'Брил Эмболо',
  'Manuel Akanji': 'Мануэль Аканджи',
  'Ricardo Rodríguez': 'Рикардо Родригес',
  'Denis Zakaria': 'Дени Закариа',

  // Хорватия
  'Luka Modrić': 'Лука Модрич',
  'Ivan Perisic': 'Иван Перишич',
  'Mateo Kovačić': 'Матео Ковачич',
  'Marcelo Brozović': 'Марсело Брозович',
  'Dejan Lovren': 'Деян Ловрен',
  'Dominik Livaković': 'Доминик Ливакович',
  'Bruno Petković': 'Бруно Петкович',
  'Joško Gvardiol': 'Йошко Гвардиол',

  // Дания
  'Christian Eriksen': 'Кристиан Эриксен',
  'Pierre-Emile Højbjerg': 'Пьер-Эмиль Хёйбьерг',
  'Martin Braithwaite': 'Мартин Брейтуэйт',
  'Kasper Schmeichel': 'Каспер Шмейхель',
  'Simon Kjær': 'Симон Кьяр',

  // Эквадор
  'Enner Valencia': 'Эннер Валенсия',
  'Moisés Caicedo': 'Мойсес Кайседо',

  // Уругвай
  'Luis Suárez': 'Луис Суарес',
  'Edinson Cavani': 'Эдинсон Кавани',
  'Federico Valverde': 'Федерико Вальверде',
  'Rodrigo Bentancur': 'Родриго Бентанкур',
  'Ronald Araújo': 'Рональд Арауjo',
  'Darwin Núñez': 'Дарвин Нуньес',
  'José María Giménez': 'Хосе Мария Хименес',

  // Колумбия
  'James Rodríguez': 'Хамес Родригес',
  'Falcao': 'Фалькао',
  'Juan Cuadrado': 'Хуан Куадрадо',
  'Luis Díaz': 'Луис Диас',
  'Davinson Sánchez': 'Давинсон Санчес',
  'Radamel Falcao': 'Радамель Фалькао',

  // Катар
  'Almoez Ali': 'Альмоэз Али',
  'Akram Afif': 'Акрам Афиф',

  // Саудовская Аравия
  'Salem Al-Dawsari': 'Салем Аль-Досари',
  'Mohammed Al-Owais': 'Мухаммад Аль-Оуайс',

  // Ганa
  'André Ayew': 'Андре Айю',
  'Jordan Ayew': 'Джордан Айю',
  'Thomas Partey': 'Томас Парти',
  'Mohamed Kudus': 'Мухамед Кудус',

  // Чехия
  'Tomáš Chorý': 'Томаш Хори',
  'Jan Kliment': 'Ян Климент',
  'Mojmír Chytil': 'Моймир Хитил',
  'Denis Višinský': 'Денис Вишински',
  'David Jurásek': 'Давид Юрасек',
  'Adam Karabec': 'Адам Карабец',
  'Michal Sadílek': 'Михал Садилек',
  'Vladimir Coufal': 'Владимир Цуфал',
  'Vladimír Coufal': 'Владимир Цуфал',
  'Vladimír Darida': 'Владимир Дарида',
  'Tomáš Ladra': 'Томаш Ладра',
  'Lukáš Provod': 'Лукаш Провод',
  'Pavel Šulc': 'Павел Шульц',
  'Lukáš Červ': 'Лукаш Черв',
  'Martin Jedlička': 'Мартин Едличка',
  'Matej Kovar': 'Матей Ковар',
  'Lukáš Horníček': 'Лукаш Горничек',
  'Jaroslav Zelený': 'Ярослав Зелены',
  'Tomáš Holeš': 'Томаш Голеш',
  'Martin Vitík': 'Мартин Витик',
  'Robin Hranac': 'Робин Хранач',
  'Štěpán Chaloupek': 'Штепан Халоупек',
};

/** Транслитерация латиницы → кириллица для неизвестных имён */
const TRANSLIT: [RegExp, string][] = [
  [/sch/gi, 'ш'],
  [/tch/gi, 'ч'],
  [/shch/gi, 'щ'],
  [/zh/gi, 'ж'],
  [/kh/gi, 'х'],
  [/ts/gi, 'ц'],
  [/sh/gi, 'ш'],
  [/ch/gi, 'ч'],
  [/ph/gi, 'ф'],
  [/th/gi, 'т'],
  [/ck/gi, 'к'],
  [/qu/gi, 'кв'],
  [/ks/gi, 'кс'],
  [/ae/gi, 'э'],
  [/oe/gi, 'е'],
  [/ue/gi, 'ю'],
  [/ij/gi, 'ий'],
  [/ia/gi, 'я'],
  [/io/gi, 'йо'],
  [/ie/gi, 'е'],
  [/iu/gi, 'ю'],
  [/aa/gi, 'аа'],
  [/ee/gi, 'и'],
  [/oo/gi, 'у'],
  [/ff/gi, 'фф'],
  [/ll/gi, 'лл'],
  [/nn/gi, 'нн'],
  [/ss/gi, 'сс'],
  [/tt/gi, 'тт'],
  [/pp/gi, 'пп'],
  [/a/gi, 'а'],
  [/b/gi, 'б'],
  [/c/gi, 'к'],
  [/d/gi, 'д'],
  [/e/gi, 'е'],
  [/f/gi, 'ф'],
  [/g/gi, 'г'],
  [/h/gi, 'х'],
  [/i/gi, 'и'],
  [/j/gi, 'й'],
  [/k/gi, 'к'],
  [/l/gi, 'л'],
  [/m/gi, 'м'],
  [/n/gi, 'н'],
  [/o/gi, 'о'],
  [/p/gi, 'п'],
  [/q/gi, 'к'],
  [/r/gi, 'р'],
  [/s/gi, 'с'],
  [/t/gi, 'т'],
  [/u/gi, 'у'],
  [/v/gi, 'в'],
  [/w/gi, 'в'],
  [/x/gi, 'кс'],
  [/y/gi, 'й'],
  [/z/gi, 'з'],
];

function transliterateWord(word: string): string {
  // Уже кириллица
  if (/[а-яА-ЯёЁ]/.test(word)) return word;
  // Только цифры и дефис
  if (!/[a-zA-Z]/.test(word)) return word;

  let result = word;
  // Обрабатываем диграфы сначала
  for (const [re, ru] of TRANSLIT) {
    result = result.replace(re, (m) =>
      m.charAt(0) === m.charAt(0).toUpperCase() ? ru.charAt(0).toUpperCase() + ru.slice(1) : ru,
    );
    if (!/[a-zA-ZÀ-ž]/.test(result)) break;
  }
  // Убираем оставшиеся диакритические символы → их латинские основы → транслит
  result = result.normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [re, ru] of TRANSLIT.slice(TRANSLIT.findIndex(([r]) => r.source === 'a'))) {
    result = result.replace(re, (m) =>
      m.charAt(0) === m.charAt(0).toUpperCase() ? ru.charAt(0).toUpperCase() + ru.slice(1) : ru,
    );
  }
  return result;
}

export function getPlayerNameRu(name: string, locale: string): string {
  if (locale !== 'ru') return name;

  // Точное совпадение
  const exact = KNOWN[name];
  if (exact) return exact;

  // Нормализуем имя (убираем диакритику) и ищем снова
  const normalized = name.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const byNorm = KNOWN[normalized];
  if (byNorm) return byNorm;

  // Автотранслитерация по частям имени
  return name
    .split(/\s+/)
    .map((part) => transliterateWord(part))
    .join(' ');
}
