import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { calculateGPA, gradePoints, uid } from '../data/storage.js';

export default function Academic({ api }) {
  const { courses, semesters } = api.data;
  const result = calculateGPA(courses);

  const addCourse = () => api.update('courses', [...courses, { id: uid(), name: '', credit: '', grade: '' }]);
  const updateCourse = (id, patch) => api.update('courses', courses.map((c) => c.id === id ? { ...c, ...patch } : c));
  const removeCourse = (id) => api.update('courses', courses.filter((c) => c.id !== id));
  const saveSemester = () => {
    if (!result.credits) return alert('Add at least one course first.');
    const name = `Semester ${semesters.length + 1}`;
    api.update('semesters', [...semesters, { id: uid(), name, gpa: result.gpa, credits: result.credits, courses, date: new Date().toLocaleDateString() }]);
    api.update('courses', []);
  };

  return (
    <>
      <Header title="Academic CGPA Workspace" />
      <section className="statsGrid three">
        <StatCard label="Semester GPA" value={result.gpa.toFixed(2)} note="live calculation" />
        <StatCard label="Total Credits" value={result.credits} note="current course load" tone="green" />
        <StatCard label="Saved Semesters" value={semesters.length} note="history records" tone="purple" />
      </section>

      <section className="twoCol wideLeft">
        <Card>
          <div className="cardHead">
            <div><h3>Courses</h3><p>Start blank and add your real semester courses.</p></div>
            <button className="primaryBtn" onClick={addCourse}>Add Course</button>
          </div>
          {courses.length === 0 ? <EmptyState title="No courses added" text="Click Add Course to start calculating your GPA." /> : (
            <div className="courseList">
              {courses.map((course) => (
                <div className="courseRow" key={course.id}>
                  <input placeholder="Course name" value={course.name} onChange={(e) => updateCourse(course.id, { name: e.target.value })} />
                  <input type="number" min="0" step="0.5" placeholder="Credit" value={course.credit} onChange={(e) => updateCourse(course.id, { credit: e.target.value })} />
                  <select value={course.grade} onChange={(e) => updateCourse(course.id, { grade: e.target.value })}>
                    <option value="">Grade</option>
                    {Object.keys(gradePoints).map((g) => <option key={g} value={g}>{g} ({gradePoints[g].toFixed(2)})</option>)}
                  </select>
                  <button className="dangerBtn" onClick={() => removeCourse(course.id)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="resultCard">
          <p className="eyebrow">Live Result</p>
          <h2>{result.gpa.toFixed(2)}</h2>
          <p>Semester GPA</p>
          <div className="progress"><span style={{ width: `${(result.gpa / 4) * 100}%` }} /></div>
          <button className="primaryBtn full" onClick={saveSemester}>Save Semester</button>
        </Card>
      </section>
    </>
  );
}
