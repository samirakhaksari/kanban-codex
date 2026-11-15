<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## راهنمای رابط کاربری فرانت‌اند

- صفحه ورود در مسیرهای src/components/auth-gate.tsx و src/app/globals.css پیاده‌سازی شده است. رفتار ورود، نشست و بازیابی داده‌های آن را هنگام تغییر ظاهر حفظ کن.
- طرح تأییدشده ورود، تصویرسازی کوچک‌تر در سمت چپ و فرم شیشه‌ای جمع‌وجور در سمت راست دارد؛ اندازه‌ها در هر دو تم یکسان باشند. موبایل و تبلت باریک پس‌زمینه ساده و بدون تصویر دارند. برای فرم اسکرول داخلی ایجاد نکن؛ در صفحه‌های بسیار کوتاه یا با صفحه‌کلید باز، دسترسی به محتوا با اسکرول طبیعی صفحه حفظ شود.
- تصویر ثابت تیم و atlas جزئیات در public/images/auth-team.webp و public/images/auth-workflow-atlas.webp قرار دارند و در src/components/auth-scene.tsx ترکیب می‌شوند. حرکت فقط برای جزئیات تزئینی باشد؛ طبق درخواست جدید کاربر، کنترل توقف دستی حذف شده است؛ prefers-reduced-motion را حفظ کن. رنگ‌های ورود از data-theme خود auth-screen خوانده شوند و به تم ریشه وابسته نباشند.
- هر دو تم روشن و تیره، فارسی راست‌به‌چپ، انگلیسی چپ‌به‌راست و چیدمان واکنش‌گرا را حفظ کن. تصویر ورود باید تصویرسازی همکاری و جریان کار باشد، نه بازسازی خود برد کانبان.
- ثبت‌نام، فراموشی رمز و ورود Google تا زمان پیاده‌سازی سرویس واقعی فقط گزینه‌های نمایشی هستند؛ آن‌ها را به‌عنوان ورود واقعی معرفی نکن.


## برد و پروفایل

- طراحی تأییدشده برد در src/app/workspace.css و src/app/workspace-controls.css به محدوده shell.workspace محدود است؛ ورود را با آن تغییر نده. منوی راست در دسکتاپ حفظ شود و دکمه حساب در سمت چپ سربرگ باشد.
- پروفایل در src/components/profile-page.tsx و src/lib/profile.ts است و از API حساب واردشده استفاده می‌کند. نام و عکس نمونه را روی حساب واقعی ذخیره نکن؛ پروفایل خالی از نام کاربری استفاده می‌کند.
- آواتارهای اعضای نمونه از atlas دو در دو public/images/member-avatars.webp خوانده می‌شوند. حساب شخصی را از روی نام به عضو نمونه وصل نکن.
- عملیات کارت و ستون در disclosureهای دارای برچسب دسترس‌پذیر است. اسکرول افقی برد داخل خود برد بماند؛ برای متن پنهان نام اعضا، containing block همان assignee-chip باشد.
- تغییرات پروفایل با ذخیره صریح ثبت شوند؛ خطا پیش‌نمایش را به جای اطلاعات ثبت‌شده معرفی نکند و خروج از فرم ذخیره‌نشده نیازمند انتخاب کاربر باشد.

- منوی راست به‌صورت rail جمع‌شده شروع شود؛ در دسکتاپ با hover و تمرکز صفحه‌کلید باز شود و با دکمه قابل ثابت‌کردن باشد. در موبایل از دکمه استفاده کن. چت در فضای رزروشدهٔ همین منو بماند و روی برد نیفتد.
- نمودارها در نمای جداگانهٔ گزارشات زیر برد پروژه هستند و کل پروژه را گزارش می‌کنند. خلاصه، جست‌وجو و فیلترها در یک نوار جمع‌وجور باشند. در متن‌های تسک از «تسک» استفاده کن؛ نام کاربری و فضای کار یا دادهٔ کاربر را جایگزین نکن.
- ستون تازه فوراً منوی عملیات دارد؛ تغییر نام با blur یا Enter ثبت و با Escape لغو می‌شود.
