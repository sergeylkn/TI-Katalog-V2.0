// App.js
// ============================================================================
// Kettle&Body — застосунок для тренувань (React Native + Expo)
// Дизайн-система «Volt Impact» (варіант A зі Stitch)
//
// - Повний каталог: 36 вправ (23 з гирею + 13 зі своєю вагою) за групами м'язів
// - Картка вправи: техніка (4 кроки), м'язи, перемикач ваги 16/24/32 кг
// - Тижневий план: Пн/Ср/Пт — CrossFit, Вт — верх, Чт — ноги, Сб — кор, Нд — відпочинок
// - Голосовий таймер (expo-speech, uk-UA) + вібрація
//
// Один файл, без додаткових залежностей (expo-speech входить до Expo SDK).
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Vibration,
  Platform,
} from "react-native";
import * as Speech from "expo-speech";

// ============================================================================
// КОЛЬОРИ — «Volt Impact»
// ============================================================================
const COLORS = {
  bg: "#0A0B0E",
  card: "#15171C",
  cardAlt: "#1E2128",
  accent: "#C6FF00",
  accentSec: "#4CD964",
  accentRest: "#7A8CA3",
  text: "#FFFFFF",
  textDim: "#9AA0AC",
  border: "rgba(255,255,255,0.08)",
  onAccent: "#0A0B0E",
};

// ============================================================================
// КАТАЛОГ ВПРАВ (36) — дані з макетів Stitch «Kettle&Body — Volt Impact»
// kb: true — вправа з гирею (перемикач 16/24/32), false — своя вага
// rec: { sets, reps, unit ("повт" | "с" | "на ногу" | "на руку" | "на бік"), baseW }
// ============================================================================
const GROUPS = [
  { id: "legs", name: "Ноги / Сідниці", icon: "🦵" },
  { id: "back", name: "Спина", icon: "🔙" },
  { id: "chest", name: "Груди / Плечі", icon: "💪" },
  { id: "arms", name: "Руки", icon: "🦾" },
  { id: "core", name: "Кор / Прес", icon: "🎯" },
  { id: "full", name: "Все тіло", icon: "⚡" },
];

const CATALOG = [
  // --- Гиря · Ноги/Сідниці ---
  { id: "kb-goblet", name: "Гоблет-присід", group: "legs", level: "Новачок", kb: true, icon: "🏋️",
    muscles: { p: "квадрицепси, сідниці", s: "кор", st: "розгиначі спини" },
    tech: { start: "Гиря біля грудей, стопи на ширині плечей.", exec: "Присідай глибоко, коліна за напрямком носків.", breath: "Вдих униз, видих на підйомі.", mistakes: "Коліна завалюються всередину, п'яти відриваються." },
    rec: { sets: 4, reps: 12, unit: "повт", baseW: 24 } },
  { id: "kb-swing", name: "Махи гирею", group: "legs", level: "Новачок", kb: true, icon: "🏋️",
    muscles: { p: "сідниці, біцепс стегна", s: "розгиначі спини, найширші", st: "кор" },
    tech: { start: "Стопи ширше плечей, гиря попереду.", exec: "Мах за рахунок тазу, не рук.", breath: "Видих у верхній точці.", mistakes: "Присідання замість нахилу, кругла спина." },
    rec: { sets: 4, reps: 15, unit: "повт", baseW: 24 } },
  { id: "kb-rdl", name: "Румунська тяга", group: "legs", level: "Середній", kb: true, icon: "🏋️",
    muscles: { p: "біцепс стегна, сідниці", s: "розгиначі спини", st: "кор" },
    tech: { start: "Гиря в опущених руках, коліна ледь зігнуті.", exec: "Нахил тазом назад, гиря вздовж ніг.", breath: "Вдих униз, видих угору.", mistakes: "Округлення спини, згинання колін." },
    rec: { sets: 4, reps: 12, unit: "повт", baseW: 24 } },
  { id: "kb-lunge", name: "Випади з гирею", group: "legs", level: "Середній", kb: true, icon: "🏋️",
    muscles: { p: "квадрицепси, сідниці", s: "біцепс стегна", st: "кор" },
    tech: { start: "Гиря біля грудей, стійка пряма.", exec: "Крок уперед, коліно не виходить за носок.", breath: "Вдих на кроці, видих на підйомі.", mistakes: "Завал коліна всередину, короткий крок." },
    rec: { sets: 3, reps: 10, unit: "на ногу", baseW: 24 } },
  { id: "kb-sumo", name: "Присідання сумо", group: "legs", level: "Новачок", kb: true, icon: "🏋️",
    muscles: { p: "привідні, сідниці", s: "квадрицепси", st: "кор" },
    tech: { start: "Широка стійка, носки назовні, гиря між ніг.", exec: "Присідай, коліна за носками.", breath: "Вдих униз, видих угору.", mistakes: "Нахил корпусу вперед." },
    rec: { sets: 4, reps: 12, unit: "повт", baseW: 24 } },
  { id: "kb-bulg", name: "Болгарські випади", group: "legs", level: "Просунутий", kb: true, icon: "🏋️",
    muscles: { p: "сідниці, квадрицепси", s: "біцепс стегна", st: "кор, баланс" },
    tech: { start: "Задня нога на підвищенні, гиря біля грудей.", exec: "Опускайся вертикально на передній нозі.", breath: "Вдих униз, видих угору.", mistakes: "Завал корпусу, коротка стійка." },
    rec: { sets: 3, reps: 8, unit: "на ногу", baseW: 16 } },
  // --- Гиря · Спина ---
  { id: "kb-row", name: "Тяга гирі в нахилі", group: "back", level: "Новачок", kb: true, icon: "🏋️",
    muscles: { p: "найширші, ромбоподібні", s: "задня дельта, біцепс", st: "розгиначі спини, кор" },
    tech: { start: "Нахил 45°, спина пряма, гиря в руці.", exec: "Тягни гирю до поясу, лікоть уздовж тіла.", breath: "Видих на тязі.", mistakes: "Округлена спина, ривок корпусом." },
    rec: { sets: 4, reps: 10, unit: "повт", baseW: 24 } },
  { id: "kb-row1", name: "Тяга однією рукою", group: "back", level: "Новачок", kb: true, icon: "🏋️",
    muscles: { p: "найширші", s: "трапеції, біцепс", st: "кор" },
    tech: { start: "Упор рукою на лаву, спина паралельно підлозі.", exec: "Тягни гирю до стегна без розвороту корпусу.", breath: "Видих на тязі.", mistakes: "Розворот тулуба, кругла спина." },
    rec: { sets: 4, reps: 10, unit: "на руку", baseW: 24 } },
  { id: "kb-dead", name: "Станова тяга з гирею", group: "back", level: "Середній", kb: true, icon: "🏋️",
    muscles: { p: "розгиначі спини, сідниці", s: "біцепс стегна", st: "кор, трапеції" },
    tech: { start: "Гиря між стоп, спина пряма.", exec: "Піднімайся за рахунок ніг і тазу.", breath: "Видих на підйомі.", mistakes: "Тяга спиною, округлення попереку." },
    rec: { sets: 4, reps: 10, unit: "повт", baseW: 32 } },
  // --- Гиря · Груди/Плечі ---
  { id: "kb-press", name: "Жим стоячи", group: "chest", level: "Середній", kb: true, icon: "🏋️",
    muscles: { p: "дельти", s: "трицепс", st: "кор, сідниці" },
    tech: { start: "Гиря на плечі, лікоть під гирею.", exec: "Жми вертикально вгору до прямої руки.", breath: "Видих на жимі.", mistakes: "Прогин попереку, жим убік." },
    rec: { sets: 4, reps: 8, unit: "на руку", baseW: 24 } },
  { id: "kb-push", name: "Швунг", group: "chest", level: "Середній", kb: true, icon: "🏋️",
    muscles: { p: "дельти", s: "ноги, трицепс", st: "кор" },
    tech: { start: "Гиря на плечі, легкий підсід.", exec: "Поштовх ногами + дожим рукою.", breath: "Видих на поштовху.", mistakes: "Ранній жим без ніг." },
    rec: { sets: 4, reps: 8, unit: "повт", baseW: 24 } },
  { id: "kb-floor", name: "Жим лежачи з підлоги", group: "chest", level: "Новачок", kb: true, icon: "🏋️",
    muscles: { p: "груди", s: "трицепс, передня дельта", st: "кор" },
    tech: { start: "Лежачи, гиря над грудьми.", exec: "Опускай лікоть до підлоги, жми вгору.", breath: "Вдих униз, видих угору.", mistakes: "Відрив попереку, різкий кидок." },
    rec: { sets: 4, reps: 10, unit: "повт", baseW: 24 } },
  { id: "kb-arnold", name: "Жим Арнольда", group: "chest", level: "Середній", kb: true, icon: "🏋️",
    muscles: { p: "дельти (всі пучки)", s: "трицепс", st: "кор" },
    tech: { start: "Гиря перед плечем хватом до себе.", exec: "Розворот кисті під час жиму вгору.", breath: "Видих на жимі.", mistakes: "Ривок, прогин попереку." },
    rec: { sets: 3, reps: 10, unit: "повт", baseW: 16 } },
  // --- Гиря · Руки ---
  { id: "kb-curl", name: "Підйом на біцепс", group: "arms", level: "Новачок", kb: true, icon: "🏋️",
    muscles: { p: "біцепс", s: "передпліччя", st: "кор" },
    tech: { start: "Гиря в опущеній руці, лікоть притиснутий.", exec: "Згинай руку без розгойдування.", breath: "Видих на підйомі.", mistakes: "Розгойдування корпусом." },
    rec: { sets: 4, reps: 10, unit: "на руку", baseW: 16 } },
  { id: "kb-tri", name: "Розгинання на трицепс", group: "arms", level: "Новачок", kb: true, icon: "🏋️",
    muscles: { p: "трицепс", s: "дельти", st: "кор" },
    tech: { start: "Гиря за головою двома руками.", exec: "Розгинай руки вгору, лікті нерухомі.", breath: "Видих на розгинанні.", mistakes: "Розведення ліктів у боки." },
    rec: { sets: 4, reps: 12, unit: "повт", baseW: 16 } },
  // --- Гиря · Кор ---
  { id: "kb-tgu", name: "Турецький підйом", group: "core", level: "Просунутий", kb: true, icon: "🏋️",
    muscles: { p: "кор, плечі", s: "сідниці, ноги", st: "все тіло" },
    tech: { start: "Лежачи, гиря на прямій руці вгорі.", exec: "Підйом у стійку через лікоть, кисть, випад.", breath: "Рівне дихання, без затримок.", mistakes: "Погляд не на гирі, поспіх." },
    rec: { sets: 3, reps: 3, unit: "на бік", baseW: 16 } },
  { id: "kb-twist", name: "Російські повороти", group: "core", level: "Новачок", kb: true, icon: "🏋️",
    muscles: { p: "косі м'язи", s: "прямий м'яз живота", st: "згиначі стегна" },
    tech: { start: "Сидячи, корпус відхилений, гиря перед грудьми.", exec: "Повороти корпусу вліво-вправо.", breath: "Видих на повороті.", mistakes: "Округлена спина, рух лише руками." },
    rec: { sets: 3, reps: 20, unit: "повт", baseW: 16 } },
  { id: "kb-renegade", name: "Тяга в планці", group: "core", level: "Просунутий", kb: true, icon: "🏋️",
    muscles: { p: "кор, найширші", s: "плечі, трицепс", st: "сідниці" },
    tech: { start: "Планка на гирях.", exec: "Тяга гирі до поясу без розвороту тазу.", breath: "Видих на тязі.", mistakes: "Розворот тазу, провисання попереку." },
    rec: { sets: 3, reps: 8, unit: "на руку", baseW: 16 } },
  { id: "kb-windmill", name: "Вітряк", group: "core", level: "Просунутий", kb: true, icon: "🏋️",
    muscles: { p: "косі м'язи", s: "плечі, сідниці", st: "біцепс стегна" },
    tech: { start: "Гиря вгорі на прямій руці, стопи під кутом.", exec: "Нахил убік, друга рука ковзає по нозі.", breath: "Вдих на нахилі, видих угору.", mistakes: "Згинання руки з гирею, коліна." },
    rec: { sets: 3, reps: 6, unit: "на бік", baseW: 16 } },
  // --- Гиря · Все тіло ---
  { id: "kb-snatch", name: "Ривок гирі", group: "full", level: "Просунутий", kb: true, icon: "🏋️",
    muscles: { p: "все тіло", s: "плечі, сідниці", st: "кор" },
    tech: { start: "Гиря між ніг, спина пряма.", exec: "Одним рухом — мах і фіксація вгорі.", breath: "Видих на фіксації.", mistakes: "Дожим рукою, удар по передпліччю." },
    rec: { sets: 5, reps: 6, unit: "на руку", baseW: 16 } },
  { id: "kb-clean", name: "Взяття на груди", group: "full", level: "Середній", kb: true, icon: "🏋️",
    muscles: { p: "ноги, спина", s: "плечі, біцепс", st: "кор" },
    tech: { start: "Гиря між ніг.", exec: "Підрив тазом, м'який прийом на груди.", breath: "Видих на прийомі.", mistakes: "Удар гирі по зап'ястю." },
    rec: { sets: 4, reps: 8, unit: "повт", baseW: 24 } },
  { id: "kb-cp", name: "Клін + жим", group: "full", level: "Середній", kb: true, icon: "🏋️",
    muscles: { p: "все тіло", s: "дельти, трицепс", st: "кор" },
    tech: { start: "Гиря між ніг.", exec: "Взяття на груди + жим угору одним циклом.", breath: "Видих на жимі.", mistakes: "Пауза без фіксації, прогин попереку." },
    rec: { sets: 4, reps: 6, unit: "на руку", baseW: 24 } },
  { id: "kb-thruster", name: "Трастер", group: "full", level: "Середній", kb: true, icon: "🏋️",
    muscles: { p: "ноги, плечі", s: "трицепс", st: "кор" },
    tech: { start: "Гиря біля грудей.", exec: "Присід і одразу жим угору на підйомі.", breath: "Видих на жимі.", mistakes: "Розрив руху на дві фази." },
    rec: { sets: 4, reps: 10, unit: "повт", baseW: 24 } },
  // --- Своя вага ---
  { id: "bw-squat", name: "Присідання", group: "legs", level: "Новачок", kb: false, icon: "🤸",
    muscles: { p: "квадрицепси, сідниці", s: "біцепс стегна", st: "кор" },
    tech: { start: "Стопи на ширині плечей.", exec: "Присідай до паралелі, спина пряма.", breath: "Вдих униз, видих угору.", mistakes: "Коліна всередину, відрив п'ят." },
    rec: { sets: 4, reps: 20, unit: "повт" } },
  { id: "bw-lunge", name: "Випади", group: "legs", level: "Новачок", kb: false, icon: "🤸",
    muscles: { p: "квадрицепси, сідниці", s: "біцепс стегна", st: "кор" },
    tech: { start: "Стійка пряма, руки на поясі.", exec: "Крок уперед, коліно не за носок.", breath: "Вдих на кроці, видих угору.", mistakes: "Короткий крок, завал коліна." },
    rec: { sets: 3, reps: 12, unit: "на ногу" } },
  { id: "bw-bridge", name: "Сідничний місток", group: "legs", level: "Новачок", kb: false, icon: "🤸",
    muscles: { p: "сідниці", s: "біцепс стегна", st: "кор" },
    tech: { start: "Лежачи, стопи біля тазу.", exec: "Піднімай таз до прямої лінії.", breath: "Видих угорі.", mistakes: "Прогин попереку замість сідниць." },
    rec: { sets: 4, reps: 15, unit: "повт" } },
  { id: "bw-pistol", name: "Пістолетик", group: "legs", level: "Просунутий", kb: false, icon: "🤸",
    muscles: { p: "квадрицепси, сідниці", s: "кор", st: "баланс" },
    tech: { start: "Стоячи на одній нозі, друга вперед.", exec: "Повільний присід на одній нозі.", breath: "Вдих униз, видих угору.", mistakes: "Завал убік, округлена спина." },
    rec: { sets: 3, reps: 5, unit: "на ногу" } },
  { id: "bw-pushup", name: "Віджимання", group: "chest", level: "Новачок", kb: false, icon: "🤸",
    muscles: { p: "груди", s: "трицепс, передні дельти", st: "кор" },
    tech: { start: "Планка, долоні під плечима.", exec: "Опускайся повільно, лікті 45°.", breath: "Вдих униз, видих угору.", mistakes: "Провисання попереку." },
    rec: { sets: 4, reps: 12, unit: "повт" } },
  { id: "bw-dips", name: "Зворотні віджимання", group: "arms", level: "Середній", kb: false, icon: "🤸",
    muscles: { p: "трицепс", s: "груди, дельти", st: "кор" },
    tech: { start: "Руки на лаві за спиною.", exec: "Опускай таз, лікті назад.", breath: "Вдих униз, видих угору.", mistakes: "Лікті в боки, знизування плечима." },
    rec: { sets: 3, reps: 12, unit: "повт" } },
  { id: "bw-pullup", name: "Підтягування", group: "back", level: "Просунутий", kb: false, icon: "🤸",
    muscles: { p: "найширші", s: "біцепс, трапеції", st: "кор" },
    tech: { start: "Вис на перекладині, хват ширше плечей.", exec: "Тягни груди до перекладини.", breath: "Видих на підйомі.", mistakes: "Розгойдування, неповна амплітуда." },
    rec: { sets: 4, reps: 6, unit: "повт" } },
  { id: "bw-plank", name: "Планка", group: "core", level: "Новачок", kb: false, icon: "🤸",
    muscles: { p: "кор, прес", s: "плечі", st: "сідниці" },
    tech: { start: "Упор на передпліччя, тіло — пряма лінія.", exec: "Утримуй положення, прес напружений.", breath: "Рівне спокійне дихання.", mistakes: "Провисання або підйом тазу." },
    rec: { sets: 4, reps: 40, unit: "с" } },
  { id: "bw-crunch", name: "Скручування", group: "core", level: "Новачок", kb: false, icon: "🤸",
    muscles: { p: "прямий м'яз живота", s: "косі", st: "шия розслаблена" },
    tech: { start: "Лежачи, коліна зігнуті.", exec: "Скручуй лопатки від підлоги.", breath: "Видих на скручуванні.", mistakes: "Тяга шиї руками." },
    rec: { sets: 4, reps: 20, unit: "повт" } },
  { id: "bw-climber", name: "Альпініст", group: "core", level: "Новачок", kb: false, icon: "🤸",
    muscles: { p: "кор", s: "згиначі стегна, плечі", st: "кардіо" },
    tech: { start: "Планка на прямих руках.", exec: "Швидко тягни коліна до грудей.", breath: "Ритмічне дихання.", mistakes: "Підйом тазу вгору." },
    rec: { sets: 3, reps: 30, unit: "с" } },
  { id: "bw-superman", name: "Супермен", group: "back", level: "Новачок", kb: false, icon: "🤸",
    muscles: { p: "розгиначі спини", s: "сідниці", st: "задня дельта" },
    tech: { start: "Лежачи на животі, руки вперед.", exec: "Одночасно піднімай руки й ноги.", breath: "Видих на підйомі.", mistakes: "Ривок, перерозгинання шиї." },
    rec: { sets: 4, reps: 12, unit: "повт" } },
  { id: "bw-burpee", name: "Берпі", group: "full", level: "Середній", kb: false, icon: "🤸",
    muscles: { p: "все тіло", s: "груди, ноги", st: "кардіо" },
    tech: { start: "Стоячи.", exec: "Упор — віджимання — стрибок угору.", breath: "Ритмічне дихання.", mistakes: "Провисання попереку в упорі." },
    rec: { sets: 4, reps: 10, unit: "повт" } },
  { id: "bw-jack", name: "Джампінг-джек", group: "full", level: "Новачок", kb: false, icon: "🤸",
    muscles: { p: "все тіло", s: "ікри, дельти", st: "кардіо" },
    tech: { start: "Стоячи, руки вздовж тіла.", exec: "Стрибок: ноги в боки, руки вгору.", breath: "Ритмічне дихання.", mistakes: "Приземлення на прямі ноги." },
    rec: { sets: 3, reps: 30, unit: "с" } },
];

const byId = Object.fromEntries(CATALOG.map((e) => [e.id, e]));

// ============================================================================
// ТИЖНЕВИЙ ПЛАН — домашні дні збираються з каталогу
// ============================================================================
const SCHEDULE = {
  0: { type: "rest", title: "Неділя — відпочинок" },
  1: { type: "crossfit", title: "Понеділок — CrossFit" },
  2: { type: "home", title: "Вівторок — Верх тіла",
       plan: [{ id: "kb-press", work: 40, rest: 20 }, { id: "bw-pushup", work: 40, rest: 20 },
              { id: "kb-row", work: 40, rest: 20 }, { id: "bw-plank", work: 40, rest: 20 }] },
  3: { type: "crossfit", title: "Середа — CrossFit" },
  4: { type: "home", title: "Четвер — Ноги",
       plan: [{ id: "kb-goblet", work: 60 }, { id: "kb-lunge", work: 60 }, { id: "kb-dead", work: 60 }] },
  5: { type: "crossfit", title: "П'ятниця — CrossFit" },
  6: { type: "home", title: "Субота — Кор",
       plan: [{ id: "kb-twist", work: 30, rest: 30 }, { id: "bw-climber", work: 30, rest: 30 },
              { id: "bw-crunch", work: 30, rest: 30 }, { id: "bw-plank", work: 30, rest: 30 }] },
};

// ============================================================================
// ДОПОМІЖНІ ФУНКЦІЇ
// ============================================================================
function say(text) {
  try {
    Speech.stop();
    Speech.speak(text, { language: "uk-UA", rate: 1.0, pitch: 1.0 });
  } catch (e) {}
}

function vibrate(pattern) {
  try {
    if (Platform.OS !== "web") Vibration.vibrate(pattern);
  } catch (e) {}
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Повтори з поправкою на вагу: легша гиря → більше повторів
function repsForWeight(ex, w) {
  if (!ex.kb || ex.rec.unit === "с") return ex.rec.reps;
  const f = Math.min(1.5, Math.max(0.6, ex.rec.baseW / w));
  return Math.max(3, Math.round(ex.rec.reps * f));
}

function recLabel(ex, w) {
  const reps = ex.kb ? repsForWeight(ex, w) : ex.rec.reps;
  const unit = ex.rec.unit === "повт" ? "" : ` ${ex.rec.unit}`;
  const weight = ex.kb ? ` · ${w} кг` : "";
  return `${ex.rec.sets} × ${reps}${unit}${weight}`;
}

// Черга фаз: prep(4с) → work → rest для кожного пункту плану
const PREP_SECONDS = 4;
function buildQueue(plan) {
  const queue = [];
  plan.forEach((item) => {
    const ex = byId[item.id];
    queue.push({ kind: "prep", name: ex.name, ex, seconds: PREP_SECONDS });
    queue.push({ kind: "work", name: ex.name, ex, seconds: item.work });
    if (item.rest) {
      queue.push({ kind: "rest", name: "Відпочинок", ex, seconds: item.rest });
    }
  });
  return queue;
}

// ============================================================================
// ГОЛОВНИЙ КОМПОНЕНТ: вкладки Головна / Каталог + екрани поверх
// ============================================================================
export default function App() {
  const [tab, setTab] = useState("home");        // home | catalog
  const [detail, setDetail] = useState(null);    // вправа з каталогу
  const [workout, setWorkout] = useState(null);  // план тренування (масив {id, work, rest})

  const dayConfig = SCHEDULE[new Date().getDay()];

  // Запуск таймера однієї вправи з картки: sets × (робота 40с + відпочинок 20с)
  const startSingle = (ex) => {
    const plan = [];
    for (let i = 0; i < ex.rec.sets; i++) {
      const work = ex.rec.unit === "с" ? ex.rec.reps : 40;
      plan.push({ id: ex.id, work, rest: i < ex.rec.sets - 1 ? 20 : undefined });
    }
    setDetail(null);
    setWorkout(plan);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      {workout ? (
        <WorkoutScreen plan={workout} onExit={() => setWorkout(null)} />
      ) : detail ? (
        <DetailScreen ex={detail} onBack={() => setDetail(null)} onStart={startSingle} />
      ) : (
        <>
          {tab === "home" ? (
            <HomeScreen dayConfig={dayConfig} onStart={() => setWorkout(dayConfig.plan)} onOpen={setDetail} />
          ) : (
            <CatalogScreen onOpen={setDetail} />
          )}
          <View style={styles.tabs}>
            <TouchableOpacity style={styles.tabBtn} onPress={() => setTab("home")}>
              <Text style={[styles.tabIcon, tab === "home" && styles.tabOn]}>⌂</Text>
              <Text style={[styles.tabLbl, tab === "home" && styles.tabOn]}>Головна</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabBtn} onPress={() => setTab("catalog")}>
              <Text style={[styles.tabIcon, tab === "catalog" && styles.tabOn]}>▦</Text>
              <Text style={[styles.tabLbl, tab === "catalog" && styles.tabOn]}>Каталог</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// ГОЛОВНА — тренування дня
// ============================================================================
function HomeScreen({ dayConfig, onStart, onOpen }) {
  const isHome = dayConfig.type === "home";
  return (
    <ScrollView contentContainerStyle={styles.homeScroll}>
      <Text style={styles.appTitle}>Тренування дня</Text>
      <Text style={styles.daySubtitle}>{dayConfig.title}</Text>

      {dayConfig.type === "crossfit" && (
        <View style={[styles.bigCard, { borderColor: COLORS.accent }]}>
          <Text style={styles.bigEmoji}>🏋️</Text>
          <Text style={styles.bigCardTitle}>Сьогодні кросфіт</Text>
          <Text style={styles.bigCardText}>Вирушай до залу — сьогодні функціональне тренування.</Text>
        </View>
      )}

      {dayConfig.type === "rest" && (
        <View style={[styles.bigCard, { borderColor: COLORS.accentRest }]}>
          <Text style={styles.bigEmoji}>😴</Text>
          <Text style={styles.bigCardTitle}>День відпочинку</Text>
          <Text style={styles.bigCardText}>Відновлення — теж частина тренувань.</Text>
        </View>
      )}

      {isHome && (
        <>
          <View style={styles.previewList}>
            {dayConfig.plan.map((item, i) => {
              const ex = byId[item.id];
              return (
                <TouchableOpacity key={i} style={styles.previewItem} onPress={() => onOpen(ex)}>
                  <View style={styles.previewIndex}>
                    <Text style={styles.previewIndexText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewName}>{ex.name}</Text>
                    <Text style={styles.previewMeta}>
                      Робота: {item.work}с{item.rest ? `  ·  Відпочинок: ${item.rest}с` : ""}
                    </Text>
                  </View>
                  <Text style={styles.previewMeta}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.startBtn} activeOpacity={0.85} onPress={onStart}>
            <Text style={styles.startBtnText}>▶  Старт</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ============================================================================
// КАТАЛОГ — 36 вправ за групами м'язів + фільтр Гиря / Своя вага / Всі
// ============================================================================
function CatalogScreen({ onOpen }) {
  const [filter, setFilter] = useState("all"); // all | kb | bw
  const visible = CATALOG.filter(
    (e) => filter === "all" || (filter === "kb" ? e.kb : !e.kb)
  );
  return (
    <ScrollView contentContainerStyle={styles.homeScroll}>
      <Text style={styles.appTitle}>Вправи</Text>
      <View style={styles.seg}>
        {[["kb", "Гиря"], ["bw", "Своя вага"], ["all", "Всі"]].map(([key, lbl]) => (
          <TouchableOpacity
            key={key}
            style={[styles.segItem, filter === key && styles.segOn]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.segText, filter === key && styles.segTextOn]}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {GROUPS.map((g) => {
        const items = visible.filter((e) => e.group === g.id);
        if (!items.length) return null;
        return (
          <View key={g.id}>
            <Text style={styles.groupLabel}>{g.icon}  {g.name}</Text>
            {items.map((ex) => (
              <TouchableOpacity key={ex.id} style={styles.previewItem} onPress={() => onOpen(ex)}>
                <Text style={styles.exIcon}>{ex.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewName}>{ex.name}</Text>
                  <Text style={styles.previewMeta}>{ex.muscles.p}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[styles.badge, ex.kb ? styles.badgeKb : styles.badgeBw]}>
                    {ex.kb ? "24 кг" : "Своя вага"}
                  </Text>
                  <Text style={styles.previewMeta}>{ex.level}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ============================================================================
// КАРТКА ВПРАВИ — техніка, м'язи, перемикач ваги, запуск таймера
// ============================================================================
function DetailScreen({ ex, onBack, onStart }) {
  const [weight, setWeight] = useState(24);
  return (
    <ScrollView contentContainerStyle={styles.homeScroll}>
      <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.backText}>‹ Назад</Text>
      </TouchableOpacity>
      <Text style={[styles.appTitle, { marginTop: 8 }]}>{ex.name}</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <Text style={[styles.badge, styles.badgeKb]}>
          {GROUPS.find((g) => g.id === ex.group).name}
        </Text>
        <Text style={[styles.badge, styles.badgeBw]}>{ex.level}</Text>
      </View>

      {/* Перемикач ваги — лише для гирі */}
      {ex.kb && (
        <View style={styles.seg}>
          {[16, 24, 32].map((w) => (
            <TouchableOpacity
              key={w}
              style={[styles.segItem, weight === w && styles.segOn]}
              onPress={() => setWeight(w)}
            >
              <Text style={[styles.segText, weight === w && styles.segTextOn]}>{w} кг</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* М'язи */}
      <View style={styles.descCard}>
        <Text style={styles.descTitle}>Працюючі м'язи</Text>
        <Text style={styles.descText}>
          <Text style={{ color: COLORS.accent }}>Основні:</Text> {ex.muscles.p}{"\n"}
          <Text style={{ color: COLORS.accentSec }}>Допоміжні:</Text> {ex.muscles.s}{"\n"}
          <Text style={{ color: COLORS.textDim }}>Стабілізатори:</Text> {ex.muscles.st}
        </Text>
      </View>

      {/* Техніка */}
      <View style={styles.descCard}>
        <Text style={styles.descTitle}>Техніка</Text>
        {[
          ["Вихідне положення", ex.tech.start],
          ["Виконання", ex.tech.exec],
          ["Дихання", ex.tech.breath],
          ["Часті помилки", ex.tech.mistakes],
        ].map(([t, d], i) => (
          <View key={i} style={{ flexDirection: "row", marginTop: i ? 10 : 4 }}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{t}</Text>
              <Text style={styles.descText}>{d}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Рекомендація */}
      <View style={[styles.descCard, { flexDirection: "row", alignItems: "center" }]}>
        <Text style={[styles.previewName, { flex: 1 }]}>Рекомендація</Text>
        <Text style={[styles.previewName, { color: COLORS.accent }]}>
          {recLabel(ex, weight)}
        </Text>
      </View>

      <TouchableOpacity style={styles.startBtn} activeOpacity={0.85} onPress={() => onStart(ex)}>
        <Text style={styles.startBtnText}>▶  Почати таймер</Text>
      </TouchableOpacity>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ============================================================================
// ЕКРАН ТРЕНУВАННЯ — таймер з озвучкою (uk-UA) та вібрацією
// ============================================================================
function WorkoutScreen({ plan, onExit }) {
  const [queue] = useState(() => buildQueue(plan));
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(queue.length ? queue[0].seconds : 0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const intervalRef = useRef(null);
  const countdownFlags = useRef({});
  const current = queue[index];

  const announcePhase = useCallback((phase) => {
    if (!phase) return;
    vibrate(400);
    countdownFlags.current = {};
    if (phase.kind === "prep") say(`Наступна вправа: ${phase.name}`);
    else if (phase.kind === "work") say("Старт");
    else if (phase.kind === "rest") say("Відпочинок");
  }, []);

  const handleStart = () => {
    if (finished || running) return;
    if (index === 0 && remaining === queue[0]?.seconds) announcePhase(queue[0]);
    setRunning(true);
  };

  const handlePause = () => {
    setRunning(false);
    Speech.stop();
  };

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        const phase = queue[index];
        // Відлік «3, 2, 1» у фазі підготовки
        if (phase && phase.kind === "prep") {
          if (next === 3 && !countdownFlags.current[3]) { countdownFlags.current[3] = true; say("3"); }
          else if (next === 2 && !countdownFlags.current[2]) { countdownFlags.current[2] = true; say("2"); }
          else if (next === 1 && !countdownFlags.current[1]) { countdownFlags.current[1] = true; say("1"); }
        }
        if (next > 0) return next;
        const upcoming = queue[index + 1];
        if (upcoming) {
          announcePhase(upcoming);
          setIndex((k) => k + 1);
          return upcoming.seconds;
        }
        setRunning(false);
        setFinished(true);
        vibrate([0, 400, 200, 400]);
        say("Закінчили. Тренування завершено.");
        return 0;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, index, queue, announcePhase]);

  useEffect(() => {
    return () => {
      Speech.stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (finished) {
    return (
      <View style={styles.finishWrap}>
        <Text style={styles.bigEmoji}>🎉</Text>
        <Text style={styles.bigCardTitle}>Тренування завершено!</Text>
        <Text style={styles.bigCardText}>Чудова робота!</Text>
        <TouchableOpacity style={[styles.startBtn, { paddingHorizontal: 40, marginTop: 24 }]} onPress={onExit}>
          <Text style={styles.startBtnText}>На головну</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!current) return null;

  const phaseInfo = {
    prep: { label: "ПРИГОТУЙСЯ", color: COLORS.accentSec },
    work: { label: "РОБОТА", color: COLORS.accent },
    rest: { label: "ВІДПОЧИНОК", color: COLORS.accentRest },
  }[current.kind];

  return (
    <ScrollView contentContainerStyle={styles.homeScroll}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onExit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backText}>‹ Вихід</Text>
        </TouchableOpacity>
        <Text style={styles.previewMeta}>{index + 1} / {queue.length}</Text>
      </View>
      <Text style={[styles.phaseLabel, { color: phaseInfo.color }]}>{phaseInfo.label}</Text>
      <Text style={styles.exerciseName}>{current.name}</Text>
      <View style={styles.iconWrap}>
        <Text style={{ fontSize: 84 }}>{current.ex.icon}</Text>
      </View>
      <Text style={[styles.timer, { color: phaseInfo.color }]}>{fmt(remaining)}</Text>
      <View style={styles.descCard}>
        <Text style={styles.descTitle}>Техніка</Text>
        <Text style={styles.descText}>
          {current.ex.tech.start} {current.ex.tech.exec}
        </Text>
      </View>
      <View style={{ marginTop: "auto" }}>
        {!running ? (
          <TouchableOpacity
            style={[styles.startBtn, { marginTop: 0 }]}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>▶  Старт</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.startBtn, { marginTop: 0, backgroundColor: COLORS.cardAlt }]}
            onPress={handlePause}
            activeOpacity={0.85}
          >
            <Text style={[styles.startBtnText, { color: COLORS.text }]}>❚❚  Пауза</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ============================================================================
// СТИЛІ
// ============================================================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  homeScroll: { padding: 24, paddingTop: 32, flexGrow: 1 },
  appTitle: { color: COLORS.text, fontSize: 32, fontWeight: "800", letterSpacing: -0.5, marginBottom: 6 },
  daySubtitle: { color: COLORS.textDim, fontSize: 16, marginBottom: 24 },

  bigCard: {
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1.5,
    padding: 28, alignItems: "center", marginTop: 16,
  },
  bigEmoji: { fontSize: 54, marginBottom: 12 },
  bigCardTitle: { color: COLORS.text, fontSize: 24, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  bigCardText: { color: COLORS.textDim, fontSize: 15, textAlign: "center", lineHeight: 22 },

  previewList: { marginTop: 4, marginBottom: 20 },
  previewItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  previewIndex: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accent,
    alignItems: "center", justifyContent: "center",
  },
  previewIndexText: { color: COLORS.onAccent, fontWeight: "800", fontSize: 16 },
  previewName: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
  previewMeta: { color: COLORS.textDim, fontSize: 13, marginTop: 2 },
  exIcon: { fontSize: 26 },

  groupLabel: {
    color: COLORS.textDim, fontSize: 12, fontWeight: "800",
    letterSpacing: 1.5, textTransform: "uppercase", marginTop: 18, marginBottom: 10,
  },
  badge: {
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10,
    fontSize: 11, fontWeight: "800", overflow: "hidden",
  },
  badgeKb: { backgroundColor: "rgba(198,255,0,0.15)", color: COLORS.accent },
  badgeBw: { backgroundColor: "rgba(76,217,100,0.15)", color: COLORS.accentSec },

  seg: {
    flexDirection: "row", backgroundColor: COLORS.cardAlt,
    borderRadius: 14, padding: 4, gap: 4, marginBottom: 16,
  },
  segItem: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center" },
  segOn: { backgroundColor: COLORS.accent },
  segText: { color: COLORS.textDim, fontSize: 14, fontWeight: "700" },
  segTextOn: { color: COLORS.onAccent },

  descCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 14,
  },
  descTitle: {
    color: COLORS.accent, fontSize: 13, fontWeight: "800",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 8,
  },
  descText: { color: COLORS.text, fontSize: 14.5, lineHeight: 22 },
  stepNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.cardAlt,
    alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 2,
  },
  stepNumText: { color: COLORS.accent, fontSize: 12, fontWeight: "800" },
  stepTitle: {
    color: COLORS.textDim, fontSize: 11, fontWeight: "800",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 2,
  },

  startBtn: {
    backgroundColor: COLORS.accent, borderRadius: 16, paddingVertical: 17,
    alignItems: "center", marginTop: 4,
  },
  startBtnText: { color: COLORS.onAccent, fontSize: 18, fontWeight: "800" },
  backText: { color: COLORS.textDim, fontSize: 16, fontWeight: "600" },

  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  phaseLabel: { fontSize: 13, fontWeight: "800", letterSpacing: 2, marginBottom: 4 },
  exerciseName: { color: COLORS.text, fontSize: 30, fontWeight: "800", marginBottom: 14 },
  iconWrap: {
    borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center", paddingVertical: 28, marginBottom: 18,
  },
  timer: {
    fontSize: 72, fontWeight: "900", textAlign: "center",
    marginBottom: 18, fontVariant: ["tabular-nums"],
  },

  tabs: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 10, paddingBottom: 14 },
  tabIcon: { color: COLORS.textDim, fontSize: 18 },
  tabLbl: { color: COLORS.textDim, fontSize: 11, fontWeight: "700", marginTop: 2 },
  tabOn: { color: COLORS.accent },

  finishWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
});
