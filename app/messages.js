// UI translations only. User-authored gift names and letters are never translated.
export const LANGUAGES={zh:'中文',en:'English',ko:'한국어',ja:'日本語'};
// Column order: English, 中文, 한국어, 日本語.
export const MESSAGES={
 uploadSuccessTitle:['Upload successful, awaiting system review','上传成功，正在等待系统审核','업로드가 완료되어 시스템 검토를 기다리고 있어요','アップロードが完了し、システム審査を待っています'],
 uploadSuccessExplanation:['You can leave this page. Once approved, find your gift in Gallery using its generated gift number or name.','你可以离开此页面，审核通过后可在 Gallery 通过当前生成的礼物编号或名称查询。','이 페이지를 떠나셔도 됩니다. 검토 승인 후 생성된 선물 번호나 이름으로 Gallery에서 찾을 수 있어요.','このページを離れても大丈夫です。審査承認後、発行されたギフト番号または名前で Gallery を検索できます。'],
 language:['Language','语言','언어','言語'],recipient:['Recipient','收信人','받는 사람','宛名'],
 pick:['Pick a liwu to begin...','选择一件礼物开始吧……','선물을 골라 시작해 보세요…','贈り物を選んで始めましょう…'],
 name:['Gift name','礼物名称','선물 이름','プレゼントの名前'],save:['Confirm','确认','확인','確認'],cancel:['Cancel','取消','취소','キャンセル'],
 packTitle:['Pack your three gifts?','确认装入这三件礼物？','선물 세 개를 상자에 넣을까요?','3つのプレゼントを箱に入れますか？'],
 packWarning:['Photos and gift names will be locked. You can still change the inner packaging.','确认后照片和礼物名称将锁定，仍可更换内包装。','확인하면 사진과 선물 이름이 잠깁니다. 내부 포장은 계속 바꿀 수 있어요.','確定すると写真と名前がロックされます。内包装は変更できます。'],
 check:['Check again','再检查一下','다시 확인','もう一度確認'],confirmPack:['Confirm pack','确认装盒','포장 확인','箱に入れる'],
 write:['Write a little love','写下你的心意','마음을 적어 주세요','想いを書きましょう'],edit:['Tap the pen to write','点击笔或信纸写信','펜이나 편지지를 눌러 써 보세요','ペンや便箋をタップして書きましょう'],
 tuck:['Tuck it in','把信装进去','편지를 넣어 주세요','封筒に入れましょう'],seal:['Seal with love','用爱心封口','하트로 봉해 주세요','ハートで封をしましょう'],
 undo:['Tap here to undo one step; double tap to open','点击撤回一步，双击打开信纸','한 번 누르면 한 단계 취소, 두 번 누르면 편지가 열려요','タップで一段階戻る、ダブルタップで便箋を開く'],
 openLetter:['Open letter','打开信纸','편지 열기','便箋を開く'],letterRequired:['Write your message and FROM first.','请先填写信件和 FROM。','먼저 편지와 FROM을 작성해 주세요.','先に手紙とFROMを入力してください。'],
 bubble1:['For Woori Riwoo','送给我们的 RIWOO','우리 리우에게','私たちのRIWOOへ'],bubble2:['This one has to be special','这份礼物要特别一点','특별한 선물이어야 해요','特別な贈り物にしたい'],
 swipe:['Swipe to find your favorite','左右滑动寻找喜欢的样式','좌우로 밀어 마음에 드는 스타일을 골라요','左右にスワイプして好きな柄を選びましょう'],parts:['Pick a part, then choose your favorite style.','先选择部件，再挑选喜欢的样式。','부위를 고른 다음 원하는 스타일을 선택하세요.','パーツを選んでから好きな柄を選びましょう。'],
 oneStyle:['One final style supplied for this layer','此图层目前只有一种样式','이 레이어에는 현재 한 가지 스타일이 있어요','このレイヤーには現在1種類あります'],
 missing:['Asset failed to load. Retry','素材加载失败，请重试','소재를 불러오지 못했어요. 다시 시도해 주세요','素材を読み込めませんでした。再試行してください'],retry:['Retry','重试','다시 시도','再試行'],
 restart:['Make another','再做一份','새 선물 만들기','もう一つ作る'],restartTitle:['Start a new gift? This replaces the current editing draft. Save your images first.','确认制作新礼物？当前编辑草稿会被替换，请先保存图片。','새 선물을 만들까요? 현재 편집 중인 초안이 바뀝니다. 먼저 이미지를 저장해 주세요.','新しいギフトを作りますか？編集中の下書きが置き換わります。先に画像を保存してください。'],
 failed:['Something went wrong. Your work is preserved. Retry.','操作失败，作品仍保留，请重试。','작업에 실패했어요. 작품은 보관되어 있으니 다시 시도해 주세요.','処理に失敗しました。作品は保持されています。再試行してください。'],
 storageError:['Storage is unavailable; refreshing may lose your work. Save your images.','本地存储不可用，刷新可能丢失作品，请先保存图片。','로컬 저장소를 사용할 수 없어요. 새로고침 전에 이미지를 저장해 주세요.','保存領域を利用できません。再読み込みの前に画像を保存してください。'],
 invalidImage:['Choose a readable image up to 20 MB.','请选择可读取且不超过 20MB 的图片。','20MB 이하의 읽을 수 있는 이미지를 선택해 주세요.','20MB以下の読み込める画像を選んでください。'],
 imageAndName:['Choose a photo and enter a gift name.','请选择照片并填写礼物名称。','사진을 선택하고 선물 이름을 입력해 주세요.','写真を選んでプレゼントの名前を入力してください。'],
 loading:['Loading…','加载中……','불러오는 중…','読み込み中…'],
 cropHelp:['Drag your photo to position it. Pinch or use the slider to zoom.','拖动调整照片位置，双指缩放或使用下方滑杆调整大小。','사진을 드래그해 위치를 조절하세요. 두 손가락이나 슬라이더로 크기를 조절할 수 있어요.','ドラッグして位置を調整し、ピンチ操作やスライダーで拡大縮小できます。'],zoom:['Zoom','缩放','확대/축소','拡大・縮小'],
 completionPending:['Gift saved. The completion number will sync when the local service is available.','作品已保存，服务恢复后将同步完成编号。','작품을 저장했어요. 서비스가 복구되면 완료 번호가 동기화돼요.','作品は保存済みです。サービス復旧後に完成番号を同期します。'],
 previewHelp:['Tap an image to preview. Save each image below.','点击图片预览，可分别下载每张图片。','이미지를 눌러 미리 보고 각각 다운로드하세요.','画像をタップしてプレビューし、1枚ずつ保存できます。'],
 swipePreview:['Swipe left or right. Long-press an image to save.','左右滑动查看，长按图片可以保存。','좌우로 밀어 확인하고 이미지를 길게 눌러 저장하세요.','左右にスワイプして確認し、長押しで保存できます。'],
 exportNames:['Complete gift box PNG|Open gift box PNG|Rosette PNG|Share card|Unfolded gifts','完整礼盒 PNG|打开礼盒 PNG|胸花 PNG|展示卡|长条展开图','완성 선물 상자 PNG|열린 선물 상자 PNG|로제트 PNG|공유 카드|펼친 선물 이미지','完成ギフトボックス PNG|開いたギフトボックス PNG|ロゼット PNG|シェアカード|展開画像'],
 creatingZip:['Creating ZIP…','正在生成 ZIP……','ZIP 생성 중…','ZIPを作成中…'],zipReady:['ZIP ready. Tap the link again if the download did not start.','ZIP 已就绪，如未开始下载请再次点击链接。','ZIP이 준비됐어요. 다운로드가 시작되지 않으면 링크를 다시 눌러 주세요.','ZIPを作成しました。開始しない場合はリンクをもう一度タップしてください。'],
 zipFailed:['Could not create ZIP. Please try again.','ZIP 生成失败，请重试。','ZIP을 만들지 못했어요. 다시 시도해 주세요.','ZIPを作成できませんでした。再試行してください。'],previewUnavailable:['Preview unavailable','预览不可用','미리 보기를 사용할 수 없어요','プレビューできません'],imageLoadFailed:['This image could not load.','此图片加载失败。','이미지를 불러오지 못했어요.','画像を読み込めませんでした。'],
 galleryPreview:['Preview your gift and full letter before submitting.','投稿前请确认礼盒和完整长信图片。','제출 전에 선물 상자와 전체 편지 이미지를 확인하세요.','投稿前にギフトと手紙全体の画像を確認してください。'],preparingPreview:['Preparing preview…','正在生成预览……','미리 보기 준비 중…','プレビューを準備中…'],
 galleryPrivacy:['After submission, the related text information and display images will be saved for review, Gallery display, search and project archiving. Save remains available regardless of review status.','提交后，这份礼物的相关文字信息和展示图片会被保存，用于审核、Gallery 展示、搜索和项目归档。无论审核状态如何，都可以返回完成页保存作品。','제출하면 관련 텍스트와 전시 이미지가 심사, Gallery 전시, 검색 및 프로젝트 아카이브를 위해 저장됩니다. 심사 상태와 관계없이 완성 페이지에서 작품을 저장할 수 있어요.','投稿後、関連テキストと展示画像は審査、Gallery表示、検索、プロジェクトのアーカイブに保存されます。審査状況に関係なく完成ページから作品を保存できます。'],
 localReview:['Local demo: submissions are automatically mock-approved. Archive metadata is prepared locally; the archive backend is not connected.','本地演示：投稿会模拟自动审核通过。归档信息仅在本地准备，归档后端尚未接入。','로컬 데모: 제출은 자동 승인으로 처리됩니다. 아카이브 정보는 로컬에 준비되며 서버는 아직 연결되지 않았어요.','ローカルデモ：投稿は自動承認として扱われます。アーカイブ情報はローカルで準備し、保存サーバーは未接続です。'],
 galleryName:['Gallery / gift box name','Gallery 展示名 / 礼盒名字','Gallery / 선물 상자 이름','Gallery表示名・ギフト名'],submitting:['Submitting…','投稿中……','제출 중…','投稿中…'],
 submitted:['Submitted · mock-approved for local testing.','投稿成功，已模拟审核通过。','제출했어요. 로컬 테스트용으로 승인됐습니다.','投稿しました。ローカルテスト用に承認されました。'],duplicate:['This gift is already in the local Gallery.','这份礼物已在本地 Gallery 中。','이미 로컬 Gallery에 있는 선물이에요.','このギフトは既にローカルGalleryにあります。'],
 submitFailed:['Submission failed. Your work is still saved; you can retry.','投稿失败，作品仍保留，可以重试或继续 Save。','제출하지 못했어요. 작품은 보관되어 있으니 다시 시도하거나 Save할 수 있어요.','投稿に失敗しました。作品は保持されており、再試行やSaveができます。'],
 previewFailed:['Preview could not load. Please go Back and try again.','预览生成失败，请 Back 后重试。','미리 보기를 불러오지 못했어요. Back 후 다시 시도해 주세요.','プレビューできませんでした。Backで戻り再試行してください。'],
 searchHint:['No. or name…','编号或名字……','번호 또는 이름…','番号または名前…'],searchHelp:['Search by number or public name only','仅搜索编号或公开展示名','번호 또는 공개 이름으로만 검색','番号または公開名のみで検索'],
 noGifts:['No gifts found.','没有找到礼物。','선물을 찾지 못했어요.','ギフトが見つかりませんでした。'],galleryFailed:['Gallery could not load. Your gift is still saved on this device.','Gallery 加载失败，作品仍保留在本机。','Gallery를 불러오지 못했어요. 작품은 이 기기에 저장되어 있어요.','Galleryを読み込めませんでした。作品はこの端末に保存されています。'],
 archiveLabel:['Allow anonymous saving of this gift’s text for project archiving and statistics','允许匿名保存这份礼物的文字内容，用于项目归档与统计','프로젝트 아카이브와 통계를 위해 이 선물의 텍스트를 익명으로 저장하는 데 동의합니다','プロジェクトのアーカイブと統計のため、このギフトのテキストを匿名で保存することを許可する'],
 archivePrivacy:['This includes FROM and the full letter. Without consent or a Gallery submission, text stays on this device. This phase only prepares the archive locally; it does not upload it.','归档包含 FROM 和完整信件。未勾选且未投稿时，文字只保留本机。本阶段仅在本地准备归档，不上传服务器。','FROM과 전체 편지가 포함됩니다. 동의하거나 Gallery에 제출하지 않으면 텍스트는 이 기기에만 저장됩니다. 현재 단계에서는 로컬에만 준비하며 업로드하지 않아요.','FROMと手紙全文が含まれます。同意やGallery投稿がなければ端末内だけに保存されます。現段階ではローカルで準備し、アップロードしません。'],
 archivePrepared:['Archive consent and text prepared on this device. Backend not connected.','已在本机保存归档授权与文字，归档后端尚未接入。','아카이브 동의와 텍스트를 이 기기에 준비했어요. 서버는 아직 연결되지 않았어요.','アーカイブの同意とテキストを端末内に準備しました。保存サーバーは未接続です。'],
 archiveGallery:['Gallery submission includes project archiving; no additional checkbox is required.','Gallery 投稿默认进入项目归档，无需另行勾选。','Gallery 제출에는 프로젝트 아카이브가 포함되며 별도 동의란은 필요하지 않아요.','Gallery投稿はプロジェクトのアーカイブに含まれるため、追加のチェックは不要です。'],
 giftBoxName:['Gift box name (optional)','礼盒名字（选填）','선물 상자 이름 (선택)','ギフト名（任意）'],numberPending:['Gift Number pending sync','Gift Number 等待同步','Gift Number 동기화 대기 중','Gift Numberの同期待ち'],
 reviewPending:['Pending review','等待审核','심사 대기 중','審査待ち'],reviewApproved:['Approved','审核通过','승인됨','承認済み'],reviewRejected:['Not approved · Save is still available','未通过审核，仍可 Save','미승인 · Save는 계속 가능해요','非承認・Saveは引き続き利用できます'],reviewHidden:['Not public · Save is still available','未公开，仍可 Save','비공개 · Save는 계속 가능해요','非公開・Saveは引き続き利用できます']
};
MESSAGES.noDecoration=['No decoration','不加装饰','장식 없음','装飾なし'];
MESSAGES.requiredField=['Please fill in this field.','请填写此项。','이 항목을 입력해 주세요.','この項目を入力してください。'];
MESSAGES.start=['Tap the gift to begin','点击礼盒开始制作','선물 상자를 눌러 시작하세요','ギフトをタップして始めましょう'];
MESSAGES.sortHelp=['Toggle gallery number order','切换 Gallery 编号排序','Gallery 번호 정렬 전환','Galleryの番号順を切り替える'];

MESSAGES.galleryPreview=['Please confirm the gift box and complete letter image before submitting.','投稿前请确认礼盒和完整长信图片','제출 전에 선물 상자와 전체 편지 이미지를 확인해 주세요.','投稿前にギフトボックスと手紙全体の画像をご確認ください。'];
MESSAGES.galleryPrivacy=['After submission, this gift’s related text information and display images will be used for Gallery display.','提交后，这份礼物的相关文字信息和展示图片会被用于Gallery 展示','제출 후 이 선물의 관련 텍스트와 전시 이미지는 Gallery 전시에 사용됩니다.','投稿後、このギフトの関連テキストと展示画像はGalleryでの表示に使用されます。'];
MESSAGES.assigningNumber=['Registering your Gift Number…','正在取得 Gift Number……','Gift Number를 등록하고 있어요…','Gift Numberを登録しています…'];
MESSAGES.completionPending=['Your gift is complete. Its number has not synced. You can save a temporary copy now and regenerate the numbered version when connected.','礼物已完成，编号尚未同步。现在可以保存临时版，联网取得编号后可重新生成正式编号版。','선물이 완성됐어요. 번호는 아직 동기화되지 않았어요. 임시 파일을 저장하고 연결 후 번호가 있는 파일을 다시 만들 수 있어요.','ギフトは完成しています。番号は未同期です。仮の画像を保存し、接続後に正式な番号入り画像を再生成できます。'];
MESSAGES.temporaryExport=['Temporary copy · Gift Number pending','临时版 · Gift Number 尚未同步','임시 파일 · Gift Number 동기화 대기','仮の画像 · Gift Number未同期'];
MESSAGES.numberReady=['Gift Number synced. Save again to generate the numbered version.','Gift Number 已同步，可再次 Save 生成正式编号版。','Gift Number가 동기화됐어요. Save로 번호가 있는 파일을 다시 만드세요.','Gift Numberを同期しました。Saveで正式な番号入り画像を生成できます。'];
MESSAGES.regenerateNumbered=['Generate numbered images','重新生成正式编号版','번호가 있는 이미지 만들기','正式な番号入り画像を生成'];
MESSAGES.retryNumber=['Sync Gift Number','同步 Gift Number','Gift Number 동기화','Gift Numberを同期'];
MESSAGES.giftNumberAssigned=['Gift Number','Gift Number','Gift Number','Gift Number'];
MESSAGES.galleryNewest=['[ Newest ↓ ]','[ 公开顺序 ↓ ]','[ 공개 순서 ↓ ]','[ 公開順 ↓ ]'];
MESSAGES.galleryOldest=['[ Oldest ↑ ]','[ 公开顺序 ↑ ]','[ 공개 순서 ↑ ]','[ 公開順 ↑ ]'];
MESSAGES.sortHelp=['Toggle Gallery publication order','切换 Gallery 公开先后顺序','Gallery 공개 순서 전환','Galleryの公開順を切り替える'];
MESSAGES.galleryPublic=['Approved gifts','已通过审核的礼物','승인된 선물','承認済みギフト'];
MESSAGES.batchChanged=['The test dataset has changed. Reload before syncing; your creative work stays on this device.','测试数据批次已更新，请刷新后再同步；本地创作内容会保留。','테스트 데이터가 변경됐어요. 새로고침 후 동기화하세요. 작품은 기기에 남아 있어요.','テストデータが更新されました。再読み込みして同期してください。作品は端末に保持されます。'];
MESSAGES.galleryAlreadyReady=['This submission already has its images. Editing your local gift does not replace them.','该投稿图片已保存；修改本地作品不会替换已投稿图片。','이미 제출된 이미지가 있어요. 로컬 수정으로 바뀌지 않아요.','投稿画像は保存済みです。端末上の編集では置き換わりません。'];
MESSAGES.galleryRetrySnapshot=['Retry the saved submission snapshot shown below.','重试下方已保存的投稿快照。','아래 저장된 제출 이미지를 다시 전송해요.','以下の保存済み投稿を再送信します。'];
MESSAGES.legacyImageConfirm=['These images match my original text-only submission.','确认这些图片与原有文字投稿对应。','이 이미지가 기존 텍스트 제출과 일치함을 확인해요.','画像が以前のテキスト投稿に対応していることを確認します。'];
MESSAGES.webpUnavailable=['This browser cannot encode WebP. Save still works; use a compatible browser to submit.','此浏览器无法生成 WebP；Save 仍可用，请换兼容浏览器投稿。','WebP를 만들 수 없어요. Save는 가능하며 다른 브라우저로 제출하세요.','このブラウザーではWebPを作成できません。Saveは利用できます。'];
MESSAGES.webImageFailed=['Web images could not meet size and readability limits. Save remains available.','展示图未能同时满足体积与清晰度要求，Save 仍可用。','용량과 가독성 기준에 맞는 이미지를 만들지 못했어요. Save는 가능해요.','容量と読みやすさの条件を満たせません。Saveは利用できます。'];
MESSAGES.uploadPrepare=['Preparing private upload…','正在准备私有上传……','비공개 업로드 준비 중…','非公開アップロード準備中…'];
MESSAGES.uploadBox=['Uploading box thumbnail…','正在上传礼盒缩略图……','선물 상자 이미지 업로드 중…','ギフト画像をアップロード中…'];
MESSAGES.uploadLetter=['Uploading full letter…','正在上传展开信图片……','전체 편지 이미지 업로드 중…','手紙画像をアップロード中…'];
MESSAGES.uploadVerify=['Verifying both images…','正在校验两张图片……','두 이미지 확인 중…','画像2枚を確認中…'];
MESSAGES.uploadRetry=['Upload incomplete. Your work and submission snapshot remain on this device. Retry Send; Save still works.','图片上传未完成，本地作品及投稿快照均保留。可重试 Send，Save 不受影响。','업로드 미완료. 작품과 제출 이미지는 기기에 있어요. 다시 Send하거나 Save하세요.','アップロード未完了。作品と投稿画像は端末に保持されています。再送信やSaveができます。'];
MESSAGES.mediaSnapshotMismatch=['Images do not match the existing submission snapshot. Restore the original local work before attaching images.','图片快照与原投稿不匹配，请恢复对应的原本地作品后补传。','기존 제출과 일치하지 않아요. 원래 작품을 복원한 후 업로드하세요.','以前の投稿と一致しません。元の作品を復元してから画像を追加してください。'];
