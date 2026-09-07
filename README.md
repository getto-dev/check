# СантехСчёт Next

Улучшенная версия `getto-dev/check` — offline-first PWA-калькулятор смет на сантехнические работы.

## Что изменено

- строгая TypeScript-проверка на production build;
- ESLint без массового отключения правил;
- unit-тесты бизнес-логики;
- единый version source из `package.json`;
- версионированный формат файлов смет с валидацией;
- UUID вместо `Date.now()` как идентификатор позиции;
- деньги хранятся в целых копейках;
- `compress/decompress` вынесены в отдельный модуль;
- упрощённая модель обновления Service Worker;
- включён React Strict Mode;
- search index нормализуется заранее;
- старые сметы остаются импортируемыми по версии формата.

## Запуск

```bash
bun install
bun run dev
```

Production build:

```bash
bun run build
bun run start
```
