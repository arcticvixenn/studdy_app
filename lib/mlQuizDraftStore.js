let mlQuizDraft = null;

export function setMlQuizDraft(draft) {
  mlQuizDraft = {
    lessonId: draft?.lessonId || null,
    courseId: draft?.courseId || null,
    title: draft?.title || "Навчальний матеріал",
    text: draft?.text || "",
  };
}

export function getMlQuizDraft() {
  return mlQuizDraft;
}

export function clearMlQuizDraft() {
  mlQuizDraft = null;
}