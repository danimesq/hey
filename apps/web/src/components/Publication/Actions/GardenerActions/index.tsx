import type { ReportPublicationRequest } from '@hey/lens';
import type { FC, ReactNode } from 'react';

import {
  BanknotesIcon,
  DocumentTextIcon,
  HandThumbUpIcon
} from '@heroicons/react/24/outline';
import { HEY_API_URL } from '@hey/data/constants';
import { ModFeedType } from '@hey/data/enums';
import { GARDENER } from '@hey/data/tracking';
import {
  PublicationReportingSpamSubreason,
  useReportPublicationMutation
} from '@hey/lens';
import stopEventPropagation from '@hey/lib/stopEventPropagation';
import { Button } from '@hey/ui';
import cn from '@hey/ui/cn';
import getAuthApiHeaders from '@lib/getAuthApiHeaders';
import { Leafwatch } from '@lib/leafwatch';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useGlobalAlertStateStore } from 'src/store/non-persisted/useGlobalAlertStateStore';

interface GardenerActionsProps {
  className?: string;
  publicationId: string;
  setExpanded?: (expanded: boolean) => void;
  type?: ModFeedType.REPORTS | ModFeedType.TRUSTED_REPORTS;
}

const GardenerActions: FC<GardenerActionsProps> = ({
  className = '',
  publicationId,
  setExpanded = () => {},
  type
}) => {
  const setShowGardenerActionsAlert = useGlobalAlertStateStore(
    (state) => state.setShowGardenerActionsAlert
  );
  const [createReport, { loading }] = useReportPublicationMutation();
  const ableToRemoveReport =
    type === ModFeedType.TRUSTED_REPORTS || type === ModFeedType.REPORTS;

  const removeReport = (id: string, looksGood: boolean) => {
    const removeReport = async () => {
      return await axios.post(
        `${HEY_API_URL}/gardener/removeReport`,
        { id, looksGood, trusted: type === ModFeedType.TRUSTED_REPORTS },
        { headers: getAuthApiHeaders() }
      );
    };

    toast.promise(removeReport(), {
      error: 'Error removing report',
      loading: 'Removing report...',
      success: () => {
        setExpanded(false);
        return 'Report removed successfully';
      }
    });
  };

  const reportPublication = async ({
    subreason,
    type
  }: {
    subreason: string;
    type: string;
  }) => {
    // Variables
    const request: ReportPublicationRequest = {
      for: publicationId,
      reason: {
        [type]: {
          reason: type.replace('Reason', '').toUpperCase(),
          subreason
        }
      }
    };

    if (ableToRemoveReport) {
      removeReport(publicationId, false);
    }

    return await createReport({
      onCompleted: () => setShowGardenerActionsAlert(false, null),
      variables: { request }
    });
  };

  interface ReportButtonProps {
    config: {
      subreason: string;
      type: string;
    }[];
    icon: ReactNode;
    label: string;
  }

  const ReportButton: FC<ReportButtonProps> = ({ config, icon, label }) => (
    <Button
      disabled={loading}
      icon={icon}
      onClick={() => {
        toast.promise(
          Promise.all(
            config.map(async ({ subreason, type }) => {
              await reportPublication({ subreason, type });
              Leafwatch.track(GARDENER.REPORT, {
                report_publication_id: publicationId,
                report_reason: type,
                report_subreason: subreason
              });
            })
          ),
          {
            error: 'Error reporting publication',
            loading: 'Reporting publication...',
            success: 'Publication reported successfully'
          }
        );
      }}
      outline
      size="sm"
      variant="warning"
    >
      {label}
    </Button>
  );

  return (
    <span
      className={cn('flex flex-wrap items-center gap-3 text-sm', className)}
      onClick={stopEventPropagation}
    >
      <ReportButton
        config={[
          {
            subreason: PublicationReportingSpamSubreason.FakeEngagement,
            type: 'spamReason'
          }
        ]}
        icon={<DocumentTextIcon className="size-4" />}
        label="Spam"
      />
      <ReportButton
        config={[
          {
            subreason: PublicationReportingSpamSubreason.LowSignal,
            type: 'spamReason'
          }
        ]}
        icon={<BanknotesIcon className="size-4" />}
        label="Un-sponsor"
      />
      <ReportButton
        config={[
          {
            subreason: PublicationReportingSpamSubreason.FakeEngagement,
            type: 'spamReason'
          },
          {
            subreason: PublicationReportingSpamSubreason.LowSignal,
            type: 'spamReason'
          }
        ]}
        icon={<BanknotesIcon className="size-4" />}
        label="Both"
      />
      {ableToRemoveReport && (
        <Button
          icon={<HandThumbUpIcon className="size-4" />}
          onClick={() => removeReport(publicationId, true)}
          outline
          size="sm"
          variant="secondary"
        >
          Looks good
        </Button>
      )}
    </span>
  );
};

export default GardenerActions;
