# СантехСчёт Next

Refactored offline-first PWA-калькулятор смет на сантехнические работы.

## Улучшения относительно исходного проекта

- строгий TypeScript на build;
- строгий ESLint без массового отключения правил;
- unit-тесты бизнес-логики на Bun Test;
- версия приложения берётся из `package.json` и генерируется в `public/version.json`;
- версия формата файла сметы проверяется при импорте;
- сериализация/десериализация сметы вынесена в отдельный модуль;
- денежные значения хранятся в целых копейках;
- позиции используют `crypto.randomUUID()`;
- React Strict Mode включён;
- поиск работает через нормализацию;
- Service Worker использует одну cache-версию и очищает старые caches;
- GitHub Pages поддерживается через `NEXT_PUBLIC_BASE_PATH`;
- PDF-печать выполняется через системный print dialog, без тяжёлого PDF runtime.

## Запуск

```bash
bun install
bun run dev
```

Проверки:

```bash
bun test
bun run lint
bun run build
```

Для GitHub Pages:

```bash
NEXT_PUBLIC_BASE_PATH=/checknew bun run build
```
