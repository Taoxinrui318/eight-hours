# Eight Hours · 888 时间账本

手机优先的时间管理应用：睡眠、学习、生活各八小时，连续计时、课表、专注目标、日报与本地备份。纯静态网页，无需构建、数据库或常开电脑。

## 发布到 GitHub Pages

1. 登录 GitHub，新建名为 `eight-hours` 的 **Public（公开）**仓库。
2. 将本文件夹内的全部文件和 `icons` 文件夹上传到仓库根目录，提交到 `main`。确保首页显示的是 `index.html` 文件，而不是再套一层 `EightHours-GitHubPages` 文件夹。
3. 仓库 **Settings → Pages → Build and deployment**：Source 选择 **Deploy from a branch**，Branch 选择 **main**，Folder 选择 **/ (root)**，点击 **Save**。
4. 等待 Pages 部署完成，打开页面显示的正式链接。一般形如 `https://你的用户名.github.io/eight-hours/`。用户名与仓库名以实际显示为准。

本仓库中的 `.nojekyll` 用于按静态文件原样发布。若网页上传时遗漏它，也可以在仓库根目录用 Add file → Create new file 新建名为 `.nojekyll` 的文件，内容留空后提交。

公开的是应用代码；个人计时记录保存在使用设备的浏览器中，不会上传到 GitHub。

## 在手机使用

用手机 Safari / Chrome 打开正式 HTTPS 链接，完整打开一次后可添加到主屏幕：

- iPhone：Safari → 分享 → 添加到主屏幕。
- Android：Chrome → 菜单 → 安装应用 / 添加到主屏幕。

发布后电脑可以关机。手机可通过移动网络或任意 Wi-Fi 访问；页面资源缓存完成后，也支持离线打开与计时。页面优先使用本机缓存，不必等待不稳定的移动网络。

开始某项活动时点对应快捷按钮；选择下一项时自动结束上一项。关闭页面、锁屏不会停止时间计算。后台通知能否准点触发由手机系统决定。

## 备份与迁移

记录保存在当前设备、当前网址的浏览器存储中；更换手机或网址时，在设置中导出 JSON 备份，再在新位置恢复。清理网站数据前也请先备份。手机与电脑不会自动同步。

## 更新

上传新版本时保留相同网址，并提升 `sw.js` 内的缓存版本号。新版本缓存完成后，关闭应用的全部页面并重新打开，即可使用新版；计时数据不会随网页缓存更新被清除。

## 部署检查

- 网页能在移动网络下打开，不出现 404。
- 三张余额卡片和快捷按钮正常显示。
- 点击活动后计时增长；锁屏再打开时仍正确累计。
- 首次打开后等待数秒，再尝试飞行模式下重新打开应用。
- 设置中的备份与日报导出可使用。

GitHub Pages 官方文档：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
