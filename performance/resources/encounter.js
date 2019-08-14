export const encounterResource = {
  resourceType: 'Encounter',
  status: 'planned',
  class: 'inpatient',
  type: [
    {
      coding: [
        {
          system: 'pshr:encounter:type',
          code: 'surgery'
        }
      ]
    }
  ],
  patient: {
    reference: 'Patient/1'
  },
  period: {
    start: '2014-09-01',
    end: '2014-09-14'
  },
  priority: {
    coding: [
      {
        system: 'http://hl7.org/fhir/encounter-priority',
        code: 'no-urg',
        display: 'Elective'
      }
    ]
  },
  reason: [
    {
      coding: [
        {
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: 'B44.2',
          display: 'Aspergillosis - Tonsillar aspergillosis'
        }
      ]
    },
    {
      coding: [
        {
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: 'C09.0',
          display: 'Malignant neoplasm of tonsil - Tonsillar fossa'
        }
      ]
    }
  ],
  participant: [
    {
      type: [
        {
          coding: [
            {
              system: 'pshr:role',
              code: 'anaesthetist'
            }
          ]
        }
      ],
      individual: {
        reference: 'Practitioner/1'
      }
    },
    {
      type: [
        {
          coding: [
            {
              system: 'pshr:role',
              code: 'surgeon'
            }
          ]
        }
      ],
      individual: {
        reference: 'Practitioner/2'
      }
    }
  ],
  location: [
    {
      location: {
        reference: 'Location/1'
      }
    }
  ]
}
