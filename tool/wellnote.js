const saveBtn = document.createElement('button');
saveBtn.innerHTML = '保存';
saveBtn.style.position = 'fixed';
saveBtn.style.top = '2px';
saveBtn.style.left = '2px';
saveBtn.style.padding = '8px';
saveBtn.style.zIndex = '9999';
document.body.parentNode.insertBefore(saveBtn, document.body.parentNode.firstElementChild);

let intervalId;
const data = {};
saveBtn.onclick = () => {
    if (window.location.href !== 'https://wellnote.jp/') {
        alert('Wellnoteのサイトにログインして、ホーム画面を表示してください。');
        return;
    }
    if (!intervalId) {
        const delay = prompt('スクロールスピード。\n※数字を大きくすると遅くなります。\n※途中でスクロールが止まったら、画面中央を一度クリックしてください。\n※最後までスクロールしたら、保存ボタンをもう一度押してください。', 1);
        if(delay == null) {
            return;
        }
        intervalId = setInterval(function (scrollHeight) {
            scrollBy(0, scrollHeight);
            const dataElements = document.querySelectorAll('[data-index]');
            for (let i = 0; i < dataElements.length; i++) {
                ['.sc-kHdrYz', '.sc-gsFzgR'].forEach((selector) => {
                    for (const removeDataElement of dataElements[i].querySelectorAll(selector)) {
                        removeDataElement.remove();
                    }
                });
                data[dataElements[i].dataset.index] = dataElements[i].innerHTML.replaceAll('/photo/m/', '/photo/l/');
                if (data[dataElements[i].dataset.index].includes("/movie/thumb/")) {
                    data[dataElements[i].dataset.index] = data[dataElements[i].dataset.index].replaceAll(new RegExp('<img src="(https://s3.wellnote.jp/[^/]+)/movie/thumb/([^"]+)" [^>]+>.+?</svg>', 'ig'), '<video src="$1/movie/$2.mp4" controls></video>');
                }
            }
        }, delay, 5);
    } else {
        clearInterval(intervalId);
        intervalId = 0;

        const style = '<style>\n.gRSkeu {\n position: relative;\n z-index: 0;\n display: flex;\n flex-direction: row;\n width: 800px;\n margin: 0px auto;\n}\nmain {\n display: block;\n}\nsection {\n display: block;\n}\n.Kvggt {\n flex-shrink: 0;\n}\n.umHWY {\n display: flex;\n flex-direction: row;\n -webkit-box-pack: center;\n justify-content: center;\n -webkit-box-align: center;\n align-items: center;\n gap: 0.5rem;\n}\n.encCDM {\n display: flex;\n flex-direction: row;\n -webkit-box-pack: start;\n justify-content: start;\n align-items: flex-end;\n gap: 1rem;\n height: 2rem;\n}\n.hxfVks {\n font-size: 0.875rem;\n color: rgb(138, 138, 138);\n white-space: nowrap;\n text-overflow: ellipsis;\n overflow: hidden;\n}\n.lmmkpp {\n display: flex;\n flex-direction: column;\n padding-left: 3.5rem;\n}\n.BvCGQ {\n display: flex;\n flex-direction: column;\n gap: 1rem;\n}\n.fIagkU {\n display: grid;\n grid-template-columns: repeat(6, 1fr);\n grid-template-rows: repeat(6, 1fr);\n gap: 2px;\n width: 100%;\n aspect-ratio: 1 / 1;\n border-radius: 0.5rem;\n overflow: hidden;\n}\n.jpBOea {\n position: relative;\n overflow: hidden;\n cursor: pointer;\n}\n.jpBOea:only-child {\n grid-area: span 6 / span 6 / auto / auto;\n}\n.jpBOea:first-child:nth-last-child(2) {\n grid-area: span 6 / span 3 / auto / auto;\n}\n.jpBOea:first-child:nth-last-child(2) ~ .jpBOea {\n grid-area: span 6 / span 3 / auto / auto;\n}\n.jpBOea:first-child:nth-last-child(3) {\n grid-area: span 6 / span 3 / auto / auto;\n}\n.jpBOea:first-child:nth-last-child(3) ~ .sc-haTkiu {\n grid-area: span 3 / span 3 / auto / auto;\n}\n.jpBOea:first-child:nth-last-child(3) ~ .sc-haTkiu {\n grid-area: span 3 / span 3 / auto / auto;\n}\n.jpBOea:first-child:nth-last-child(4) {\n grid-area: span 3 / span 3 / auto / auto;\n}\n.jpBOea:first-child:nth-last-child(4) ~ .jpBOea {\n grid-area: span 3 / span 3 / auto / auto;\n}\n.jpBOea:first-child:nth-last-child(5) {\n grid-area: span 4 / span 3 / auto / auto;\n}\n.jpBOea:first-child:nth-last-child(5) + .jpBOea {\n grid-area: span 4 / span 3 / auto / auto;\n}\n.jpBOea:first-child:nth-last-child(5) ~ .sc-haTkiu:nth-child(n+3) {\n grid-area: span 2 / span 2 / auto / auto;\n}\n.jnBQzU {\n display: flex;\n -webkit-box-pack: center;\n justify-content: center;\n -webkit-box-align: center;\n align-items: center;\n text-align: center;\n position: absolute;\n top: 0px;\n left: 0px;\n height: 100%;\n width: 100%;\n color: rgb(255, 255, 255);\n background-color: rgba(0, 0, 0, 0.6);\n}\n.lahFaz {\n display: flex;\n flex-direction: row;\n -webkit-box-pack: justify;\n justify-content: space-between;\n -webkit-box-align: center;\n align-items: center;\n gap: 1rem;\n}\n.jvsiPh {\n display: flex;\n flex-direction: row;\n -webkit-box-pack: start;\n justify-content: flex-start;\n gap: 0.75rem;\n height: 2.25rem;\n min-width: 10rem;\n}\n.kHvnyo {\n overflow: hidden;\n border-radius: 50%;\n height: 2.25rem;\n width: 2.25rem;\n background-color: rgb(202, 202, 202);\n display: flex;\n -webkit-box-pack: center;\n justify-content: center;\n -webkit-box-align: center;\n align-items: center;\n}\n.bQuwqp {\n flex-shrink: 0;\n}\n.bFfRtb {\n display: flex;\n flex-direction: row;\n -webkit-box-pack: start;\n justify-content: flex-start;\n gap: 0.75rem;\n height: 3.5rem;\n min-width: 10rem;\n}\n.fUNQcE {\n display: flex;\n flex-direction: row;\n -webkit-box-pack: justify;\n justify-content: space-between;\n -webkit-box-align: center;\n align-items: center;\n gap: 1rem;\n}\n.fqnSS {\n font-size: 0.875rem;\n color: rgb(138, 138, 138);\n}\n.jPmKFQ {\n font-weight: bold;\n flex-shrink: 0;\n white-space: nowrap;\n text-overflow: ellipsis;\n overflow: hidden;\n}\n.ibLnVU {\n display: flex;\n flex-direction: column;\n -webkit-box-pack: center;\n justify-content: center;\n gap: 0.25rem;\n min-width: 0px;\n}\n.iEZyrQ {\n overflow: hidden;\n border-radius: 50%;\n height: 3.5rem;\n width: 3.5rem;\n background-color: rgb(202, 202, 202);\n display: flex;\n -webkit-box-pack: center;\n justify-content: center;\n -webkit-box-align: center;\n align-items: center;\n}\n.eOQRYD {\n object-fit: cover;\n height: 100%;\n width: 100%;\n}\n.ipojxa {\n display: flex;\n flex-direction: column;\n gap: 0.5rem;\n padding-block-end: 1rem;\n}\n.pHbnI {\n display: flex;\n flex-direction: column;\n border-block-start: 1px solid rgb(221, 221, 221);\n background-color: rgb(255, 255, 255);\n}\n.foYUmJ {\n display: flex;\n flex-direction: column;\n gap: 1rem;\n padding: 1.5rem 2rem 0.75rem;\n}\n.dRWTIA {\n display: flex;\n flex-direction: row;\n border-top: 1px solid rgb(221, 221, 221);\n border-bottom: 1px solid rgb(221, 221, 221);\n}\n.fsVjeU {\n display: flex;\n flex-direction: column;\n padding-left: 5.5rem;\n padding-right: 2rem;\n}\n.jfYeMa {\n width: 100%;\n height: 100%;\n object-fit: cover;\n}\n</style>';
        const blob = new Blob(['<html>\n<head>\n', style, '\n</head>\n<body>\n<div class="sc-jKTccl gRSkeu">\n<main>\n<section>\n', Object.values(data).join(''), '\n</section>\n</main>\n</div>\n</body>\n</html>']);
        const downloadLink = document.createElement('a');
        downloadLink.download = 'wellnote.html';
        downloadLink.href = (window.URL || window.webkitURL).createObjectURL(blob);
        downloadLink.click();
        alert('ダウンロードされたHTMLを開いて、「ページを別名で保存」で「ウェブページ、完全」で保存してください。');
    }
};
