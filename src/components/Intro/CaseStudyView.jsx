import PageOverlay from '../UI/PageOverlay';
import CaseStudy from '../Pages/CaseStudy';
import { caseStudies } from '../../data/caseStudies';

// /banana-phone — the same overlay the galaxy opens, reached without the galaxy.
export default function CaseStudyView({ onClose }) {
  const study = caseStudies['case-study-1'];
  return (
    <PageOverlay isOpen onClose={onClose} title={study.title} planetColor={study.accentColor} planetId="case-study-1">
      <CaseStudy caseStudy={study} planetColor={study.accentColor} />
    </PageOverlay>
  );
}
