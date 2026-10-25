import pypdfium2 as pdfium, glob, os
outdir = r"C:\陶宸欣\做题思维训练\_pages"
os.makedirs(outdir, exist_ok=True)
for f in sorted(glob.glob(r"C:\陶宸欣\做题思维训练\题库\*.pdf")):
    name = "A" if "数学函数" in f else "B"
    pdf = pdfium.PdfDocument(f)
    for i in range(len(pdf)):
        page = pdf[i]
        img = page.render(scale=2.2).to_pil()
        p = os.path.join(outdir, f"{name}{i+1}.png")
        img.save(p)
        print(p, img.size)
