// App.js
// ============================================================================
// Приложение для тренировок (React Native + Expo)
// - Голосовой таймер (expo-speech)
// - Вибрация при смене упражнения
// - Изображения упражнений + подробное описание техники
// - Автоопределение дня недели и типа тренировки
//
// Полностью готово к запуску из одного файла.
// Зависимости: expo-speech (входит в состав Expo SDK).
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Vibration,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Speech from "expo-speech";

// ============================================================================
// ДАННЫЕ УПРАЖНЕНИЙ
// ============================================================================
const workouts = {
  home_upper: [
    {
      name: "Жим гири",
      duration: 40,
      rest: 20,
      image: "https://images.unsplash.com/photo-1517964603305-11c0f6f66012",
      description:
        "Держи гирю на уровне плеча. Жми вверх строго вертикально. Не прогибай поясницу. Контролируй движение вниз.",
    },
    {
      name: "Отжимания",
      duration: 40,
      rest: 20,
      image: "https://images.unsplash.com/photo-1598971639058-999fe9f3a6f3",
      description:
        "Корпус прямой. Опускайся медленно. Локти под углом 45 градусов. Не проваливай поясницу.",
    },
    {
      name: "Тяга гири",
      duration: 40,
      rest: 20,
      image: "https://images.unsplash.com/photo-1594737625785-c1b1e54b3b55",
      description:
        "Спина ровная. Тяни гирю к поясу. Не округляй спину. Контроль в верхней точке.",
    },
    {
      name: "Планка",
      duration: 40,
      rest: 20,
      image: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e",
      description:
        "Держи корпус ровно. Напряги пресс. Не опускай таз и не задирай вверх.",
    },
  ],

  home_legs: [
    {
      name: "Присед с гирей",
      duration: 60,
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
      description:
        "Держи гирю у груди. Спина ровная. Колени не заваливай внутрь.",
    },
    {
      name: "Выпады",
      duration: 60,
      image: "https://images.unsplash.com/photo-1594737625785-c1b1e54b3b55",
      description: "Шаг вперёд. Колено не выходит за носок. Спина прямая.",
    },
    {
      name: "Становая тяга",
      duration: 60,
      image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b",
      description: "Тяни гирю от пола. Спина ровная. Движение за счёт бёдер.",
    },
  ],

  home_core: [
    {
      name: "Повороты с гирей",
      duration: 30,
      rest: 30,
      image: "https://images.unsplash.com/photo-1517964603305-11c0f6f66012",
      description:
        "Держи гирю перед собой. Поворачивай корпус. Работает пресс.",
    },
    {
      name: "Альпинист",
      duration: 30,
      rest: 30,
      image: "https://images.unsplash.com/photo-1599058917212-d750089bc07e",
      description: "Быстро подтягивай колени к груди. Держи корпус ровно.",
    },
    {
      name: "Dead Bug",
      duration: 30,
      rest: 30,
      image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b",
      description:
        "Лёжа на спине. Противоположные рука и нога. Контроль движения.",
    },
    {
      name: "Боковая планка",
      duration: 30,
      rest: 30,
      image: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e",
      description: "Держи корпус ровно. Не проваливай таз.",
    },
  ],
};

// ============================================================================
// РАСПИСАНИЕ НЕДЕЛИ
// getDay(): 0 = воскресенье, 1 = понедельник ... 6 = суббота
// type:
//   "crossfit" — просто экран "Сегодня кроссфит"
//   "rest"     — день отдыха
//   ключ из workouts (home_upper / home_legs / home_core) — домашняя тренировка
// ============================================================================
const SCHEDULE = {
  0: { type: "rest", title: "Воскресенье — отдых" }, // Вс
  1: { type: "crossfit", title: "Понедельник — CrossFit" }, // Пн
  2: { type: "home_upper", title: "Вторник — Верх тела" }, // Вт
  3: { type: "crossfit", title: "Среда — CrossFit" }, // Ср
  4: { type: "home_legs", title: "Четверг — Ноги" }, // Чт
  5: { type: "crossfit", title: "Пятница — CrossFit" }, // Пт
  6: { type: "home_core", title: "Суббота — Core" }, // Сб
};

// ============================================================================
// ЦВЕТА (тёмная тема)
// ============================================================================
const COLORS = {
  bg: "#0E0F13",
  card: "#181A20",
  cardAlt: "#20232B",
  accent: "#FF6B35",
  accentRest: "#3DA9FC",
  accentPrep: "#4CD964",
  text: "#FFFFFF",
  textDim: "#9AA0AC",
  border: "#2A2E38",
};

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

// Озвучка на русском языке. Прерывает предыдущую фразу.
function say(text) {
  try {
    Speech.stop();
    Speech.speak(text, { language: "ru-RU", rate: 1.0, pitch: 1.0 });
  } catch (e) {
    // На некоторых платформах Speech может быть недоступен — не роняем приложение
  }
}

// Вибрация (не поддерживается в вебе — оборачиваем в try/catch)
function vibrate(pattern) {
  try {
    if (Platform.OS !== "web") Vibration.vibrate(pattern);
  } catch (e) {}
}

// Формат секунд в MM:SS
function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Длительность подготовки перед каждым упражнением.
// 4 секунды: 1-я секунда — фраза "Следующее упражнение", затем отсчёт 3-2-1.
const PREP_SECONDS = 4;

// Построить "плоскую" очередь фаз тренировки:
// [{ kind: "prep"|"work"|"rest", name, description, image, seconds }, ...]
//
// Для каждого упражнения:
//   1) "prep" — 3 секунды подготовки (озвучка "Следующее упражнение" + "3,2,1")
//   2) "work" — сама работа (озвучка "Старт")
//   3) "rest" — отдых, если задан (озвучка "Отдых")
function buildQueue(exercises) {
  const queue = [];
  exercises.forEach((ex) => {
    // Фаза подготовки — отсчёт перед началом упражнения
    queue.push({
      kind: "prep",
      name: ex.name,
      description: ex.description,
      image: ex.image,
      seconds: PREP_SECONDS,
    });
    // Рабочая фаза
    queue.push({
      kind: "work",
      name: ex.name,
      description: ex.description,
      image: ex.image,
      seconds: ex.duration,
    });
    // Фаза отдыха (если указана)
    if (ex.rest && ex.rest > 0) {
      queue.push({
        kind: "rest",
        name: "Отдых",
        description: "Восстанови дыхание. Подготовься к следующему упражнению.",
        image: ex.image,
        seconds: ex.rest,
      });
    }
  });
  return queue;
}

// ============================================================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================================================
export default function App() {
  // Текущий день недели и его конфигурация
  const [dayConfig] = useState(() => {
    const day = new Date().getDay();
    return SCHEDULE[day];
  });

  // Тренировка запущена?
  const [started, setStarted] = useState(false);

  // Экран тренировки
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      {!started ? (
        <HomeScreen dayConfig={dayConfig} onStart={() => setStarted(true)} />
      ) : (
        <WorkoutScreen
          workoutKey={dayConfig.type}
          onExit={() => setStarted(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// ГЛАВНЫЙ ЭКРАН (выбор / старт)
// ============================================================================
function HomeScreen({ dayConfig, onStart }) {
  const isHome = !!workouts[dayConfig.type];
  const isCrossfit = dayConfig.type === "crossfit";
  const isRest = dayConfig.type === "rest";

  const exercises = isHome ? workouts[dayConfig.type] : [];

  return (
    <ScrollView contentContainerStyle={styles.homeScroll}>
      <Text style={styles.appTitle}>Тренировка дня</Text>
      <Text style={styles.daySubtitle}>{dayConfig.title}</Text>

      {/* CrossFit день */}
      {isCrossfit && (
        <View style={[styles.bigCard, { borderColor: COLORS.accent }]}>
          <Text style={styles.bigEmoji}>🏋️</Text>
          <Text style={styles.bigCardTitle}>Сегодня кроссфит</Text>
          <Text style={styles.bigCardText}>
            Отправляйся в зал — сегодня функциональная тренировка.
          </Text>
        </View>
      )}

      {/* День отдыха */}
      {isRest && (
        <View style={[styles.bigCard, { borderColor: COLORS.accentRest }]}>
          <Text style={styles.bigEmoji}>😴</Text>
          <Text style={styles.bigCardTitle}>День отдыха</Text>
          <Text style={styles.bigCardText}>
            Восстановление тоже часть тренировок. Отдыхай!
          </Text>
        </View>
      )}

      {/* Домашняя тренировка — превью + кнопка старт */}
      {isHome && (
        <>
          <View style={styles.previewList}>
            {exercises.map((ex, i) => (
              <View key={i} style={styles.previewItem}>
                <View style={styles.previewIndex}>
                  <Text style={styles.previewIndexText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewName}>{ex.name}</Text>
                  <Text style={styles.previewMeta}>
                    Работа: {ex.duration}с
                    {ex.rest ? `  ·  Отдых: ${ex.rest}с` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.startBtn}
            activeOpacity={0.85}
            onPress={onStart}
          >
            <Text style={styles.startBtnText}>▶  Старт</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ============================================================================
// ЭКРАН ТРЕНИРОВКИ (таймер + озвучка)
// ============================================================================
function WorkoutScreen({ workoutKey, onExit }) {
  // Собираем очередь фаз (prep/work/rest) один раз
  const [queue] = useState(() => buildQueue(workouts[workoutKey] || []));

  const [index, setIndex] = useState(0); // текущая фаза
  const [remaining, setRemaining] = useState(
    queue.length ? queue[0].seconds : 0
  );
  const [running, setRunning] = useState(false); // идёт ли отсчёт
  const [finished, setFinished] = useState(false); // тренировка завершена

  const intervalRef = useRef(null);
  const countdownFlags = useRef({}); // чтобы "3,2,1" не повторялось в рамках фазы

  const current = queue[index];

  // --- Озвучка при ВХОДЕ в фазу -------------------------------------------
  // Централизованное место для голосовых подсказок начала фазы.
  const announcePhase = useCallback((phase) => {
    if (!phase) return;
    vibrate(400); // вибрация на смене фазы/упражнения
    countdownFlags.current = {}; // сброс отсчёта "3,2,1"
    if (phase.kind === "prep") {
      say(`Следующее упражнение: ${phase.name}`);
    } else if (phase.kind === "work") {
      say("Старт");
    } else if (phase.kind === "rest") {
      say("Отдых");
    }
  }, []);

  // --- Кнопка Старт --------------------------------------------------------
  const handleStart = () => {
    if (finished || running) return;
    // Если запускаем самую первую фазу — озвучиваем её
    if (index === 0 && remaining === queue[0]?.seconds) {
      announcePhase(queue[0]);
    }
    setRunning(true);
  };

  // --- Кнопка Пауза --------------------------------------------------------
  const handlePause = () => {
    setRunning(false);
    Speech.stop();
  };

  // --- Основной таймер (setInterval) --------------------------------------
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        const phase = queue[index];

        // В фазе подготовки — отсчёт "3, 2, 1".
        // При PREP=4 значения next идут 3,2,1,0: числа звучат на первых трёх
        // тиках, а "Старт" — на переходе в рабочую фазу (без наложения голоса).
        if (phase && phase.kind === "prep") {
          if (next === 3 && !countdownFlags.current[3]) {
            countdownFlags.current[3] = true;
            say("3");
          } else if (next === 2 && !countdownFlags.current[2]) {
            countdownFlags.current[2] = true;
            say("2");
          } else if (next === 1 && !countdownFlags.current[1]) {
            countdownFlags.current[1] = true;
            say("1");
          }
        }

        // Фаза ещё идёт
        if (next > 0) return next;

        // Фаза закончилась — переходим к следующей
        const upcoming = queue[index + 1];
        if (upcoming) {
          // Озвучиваем начало следующей фазы и обновляем индекс
          announcePhase(upcoming);
          setIndex((k) => k + 1);
          return upcoming.seconds;
        }

        // Очередь закончилась — тренировка завершена
        setRunning(false);
        setFinished(true);
        vibrate([0, 400, 200, 400]);
        say("Закончили. Тренировка завершена.");
        return 0;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, index, queue, announcePhase]);

  // Останавливаем озвучку и таймер при выходе с экрана
  useEffect(() => {
    return () => {
      Speech.stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // --- Экран завершения ----------------------------------------------------
  if (finished) {
    return (
      <View style={styles.finishWrap}>
        <Text style={styles.finishEmoji}>🎉</Text>
        <Text style={styles.finishTitle}>Тренировка завершена!</Text>
        <Text style={styles.finishText}>Отличная работа. Молодец!</Text>
        <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
          <Text style={styles.exitBtnText}>На главный экран</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!current) {
    return (
      <View style={styles.finishWrap}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  // Метка и цвет в зависимости от типа фазы
  const phaseInfo = {
    prep: { label: "ПРИГОТОВЬСЯ", color: COLORS.accentPrep },
    work: { label: "УПРАЖНЕНИЕ", color: COLORS.accent },
    rest: { label: "ОТДЫХ", color: COLORS.accentRest },
  }[current.kind];
  const phaseColor = phaseInfo.color;

  // Прогресс по фазам (для строки "фаза X из N")
  const totalPhases = queue.length;

  return (
    <ScrollView contentContainerStyle={styles.workoutScroll}>
      {/* Верхняя панель */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onExit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backText}>‹ Выход</Text>
        </TouchableOpacity>
        <Text style={styles.phaseCounter}>
          {index + 1} / {totalPhases}
        </Text>
      </View>

      {/* Метка фазы */}
      <Text style={[styles.phaseLabel, { color: phaseColor }]}>
        {phaseInfo.label}
      </Text>

      {/* Название упражнения (крупно) */}
      <Text style={styles.exerciseName}>{current.name}</Text>

      {/* Картинка упражнения */}
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: current.image }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      {/* Таймер */}
      <Text style={[styles.timer, { color: phaseColor }]}>
        {fmt(remaining)}
      </Text>

      {/* Описание техники */}
      <View style={styles.descCard}>
        <Text style={styles.descTitle}>Техника</Text>
        <Text style={styles.descText}>{current.description}</Text>
      </View>

      {/* Кнопки управления */}
      <View style={styles.controls}>
        {!running ? (
          <TouchableOpacity
            style={[styles.ctrlBtn, { backgroundColor: COLORS.accent }]}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Text style={styles.ctrlBtnText}>▶  Старт</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.ctrlBtn, { backgroundColor: COLORS.cardAlt }]}
            onPress={handlePause}
            activeOpacity={0.85}
          >
            <Text style={styles.ctrlBtnText}>❚❚  Пауза</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

// ============================================================================
// СТИЛИ
// ============================================================================
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // --- Главный экран ---
  homeScroll: {
    padding: 24,
    paddingTop: 40,
    flexGrow: 1,
  },
  appTitle: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 6,
  },
  daySubtitle: {
    color: COLORS.textDim,
    fontSize: 17,
    marginBottom: 28,
  },

  bigCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 28,
    alignItems: "center",
    marginTop: 20,
  },
  bigEmoji: {
    fontSize: 54,
    marginBottom: 12,
  },
  bigCardTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  bigCardText: {
    color: COLORS.textDim,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  previewList: {
    marginTop: 8,
    marginBottom: 24,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewIndex: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  previewIndexText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  previewName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "600",
  },
  previewMeta: {
    color: COLORS.textDim,
    fontSize: 13,
    marginTop: 2,
  },

  startBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  startBtnText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },

  // --- Экран тренировки ---
  workoutScroll: {
    padding: 24,
    paddingTop: 20,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backText: {
    color: COLORS.textDim,
    fontSize: 17,
    fontWeight: "600",
  },
  phaseCounter: {
    color: COLORS.textDim,
    fontSize: 15,
    fontWeight: "600",
  },
  phaseLabel: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 4,
  },
  exerciseName: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 18,
  },
  imageWrap: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.card,
    marginBottom: 20,
  },
  image: {
    width: "100%",
    height: 220,
  },
  timer: {
    fontSize: 72,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
    fontVariant: ["tabular-nums"],
  },
  descCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  descTitle: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  descText: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 24,
  },
  controls: {
    marginTop: "auto",
  },
  ctrlBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  ctrlBtnText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },

  // --- Экран завершения ---
  finishWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  finishEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  finishTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  finishText: {
    color: COLORS.textDim,
    fontSize: 16,
    marginBottom: 32,
    textAlign: "center",
  },
  exitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  exitBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
});
