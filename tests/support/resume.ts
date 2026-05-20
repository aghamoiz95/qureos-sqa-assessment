import { Document, Packer, Paragraph, TextRun } from 'docx';
import fs from 'node:fs';

export type CandidateData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  nationality: string;
};

export async function createResume(filePath: string, candidate: CandidateData) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: `${candidate.firstName} ${candidate.lastName}`, bold: true, size: 28 })]
          }),
          new Paragraph(candidate.email),
          new Paragraph(candidate.phone),
          new Paragraph(candidate.location),
          new Paragraph('Summary'),
          new Paragraph('Software quality assurance engineer with hands-on Playwright, API testing, regression, and release validation experience.'),
          new Paragraph('Experience'),
          new Paragraph('QA Automation Engineer, Test Labs, 2021 - Present'),
          new Paragraph('Built browser automation suites, verified web applications, and reported clear defects for product teams.'),
          new Paragraph('Skills'),
          new Paragraph('Playwright, API testing, regression testing, browser automation, defect reporting'),
          new Paragraph('Education'),
          new Paragraph('Bachelor of Computer Science')
        ]
      }
    ]
  });

  fs.writeFileSync(filePath, await Packer.toBuffer(doc));
}
