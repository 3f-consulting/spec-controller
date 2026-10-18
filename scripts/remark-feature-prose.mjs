// remark reads a .feature description indented four spaces as code, so each line's indent is stripped first.
const dedent = (text) => text.replace(/^[ \t]+/gm, "");

export default function remarkFeatureProse() {
  const parse = this.parser;
  this.parser = (document, file) => {
    const text = String(document);
    return parse(file.extname === ".feature" ? dedent(text) : text, file);
  };
}
