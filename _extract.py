import pdfplumber, glob, json, os
out = []
for f in sorted(glob.glob(r"C:\陶宸欣\做题思维训练\题库\*.pdf")):
    with pdfplumber.open(f) as pdf:
        out.append("="*40)
        out.append(os.path.basename(f) + "  pages=" + str(len(pdf.pages)))
        for i, p in enumerate(pdf.pages):
            out.append("---- page %d ----" % (i+1))
            out.append(p.extract_text() or "")
open(r"C:\陶宸欣\做题思维训练\_pdf.txt", "w", encoding="utf-8").write("\n".join(out))
print("ok")
