import { useState, useEffect } from 'react';
import { Table } from '../../../components/ui/Table';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../hooks/useToast';
import { getHeadcountSummary, getMealUsers } from '../api';
import type { MealCountSummary, MealUserDetail } from '../../../types';

export const HeadcountSummaryPage = () => {
  const [summary, setSummary] = useState<MealCountSummary[] | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);
  const [mealUsers, setMealUsers] = useState<MealUserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: showError } = useToast();

  useEffect(() => {
    fetchHeadcountSummary();
  }, []);

  const fetchHeadcountSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHeadcountSummary();
      setSummary(data.meal_counts);
    } catch (err) {
      setError('Failed to load headcount summary');
      showError('Failed to load headcount summary. Please try again.');
      console.error('Error fetching headcount summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMealUsers = async (mealType: string) => {
    try {
      setLoadingUsers(true);
      setError(null);
      const data = await getMealUsers(mealType);
      setMealUsers(data.users);
      setSelectedMealType(mealType);
    } catch (err) {
      setError(`Failed to load users for ${mealType}`);
      showError(`Failed to load users for ${mealType}. Please try again.`);
      console.error('Error fetching meal users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleViewUsers = (mealType: string) => {
    if (selectedMealType === mealType) {
      setSelectedMealType(null);
      setMealUsers([]);
    } else {
      fetchMealUsers(mealType);
    }
  };

  const summaryColumns = [
    {
      key: 'meal_type',
      header: 'Meal Type',
      sortable: true,
    },
    {
      key: 'opted_in',
      header: 'Opted In',
      sortable: true,
    },
    {
      key: 'opted_out',
      header: 'Opted Out',
      sortable: true,
    },
    {
      key: 'opted_in_percentage',
      header: 'Opted In %',
      sortable: true,
      render: (value: unknown) => `${Number(value).toFixed(1)}%`,
    },
    {
      key: 'opted_out_percentage',
      header: 'Opted Out %',
      sortable: true,
      render: (value: unknown) => `${Number(value).toFixed(1)}%`,
    },
    {
      key: 'total_employees',
      header: 'Total Employees',
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_: unknown, row: Record<string, unknown>) => (
        <button
          onClick={() => handleViewUsers(row.meal_type as string)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {selectedMealType === row.meal_type ? 'Hide Users' : 'View Users'}
        </button>
      ),
    },
  ];

  const userColumns = [
    {
      key: 'user_id',
      header: 'User ID',
      sortable: true,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
    },
    {
      key: 'team_id',
      header: 'Team ID',
      sortable: true,
      render: (value: unknown) => String(value ?? 'N/A'),
    },
    {
      key: 'team_name',
      header: 'Team Name',
      sortable: true,
      render: (value: unknown) => String(value ?? 'N/A'),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Headcount Summary</h1>
        <p className="mt-2 text-gray-600">
          View meal participation counts for today
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Meal Counts Summary
        </h2>
        {summary && summary.length > 0 ? (
          <Table 
            columns={summaryColumns} 
            data={summary.map(item => ({ ...item })) as Record<string, unknown>[]}
          />
        ) : (
          <p className="text-gray-500 text-center py-4">No meal count data available</p>
        )}
      </div>

      {selectedMealType && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Users Opted In for {selectedMealType}
            </h2>
            <button
              onClick={() => {
                setSelectedMealType(null);
                setMealUsers([]);
              }}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : mealUsers.length > 0 ? (
            <Table 
              columns={userColumns} 
              data={mealUsers.map(item => ({ ...item })) as Record<string, unknown>[]} 
              pageSize={15} 
            />
          ) : (
            <p className="text-gray-500 text-center py-4">No users opted in for this meal</p>
          )}
        </div>
      )}
    </div>
  );
};
