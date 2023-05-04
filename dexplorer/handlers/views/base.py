from tornado.concurrent import return_future
from tornado import escape

from collections import OrderedDict, namedtuple

import numpy as np

from .plots import SummaryPlot
from .table import Table

__all__ = ['BaseView', ]

_BaseView = namedtuple('BaseView', ('data', 'config'))


class BaseView(_BaseView):

    @return_future
    def get_data_summary(self, callback=None):
        """
        Returns data frame shape
        """

        rows, columns = self.data.shape
        results = {
            'summary': {
                'type': 'DataFrame',
                'rows': rows,
                'cols': columns,
            }
        }
        callback(results)

    @return_future
    def describe_columns(self, callback=None):
        columns = OrderedDict()
        for column in self.data.columns:
            columns[column] = self._get_column_description(column)
        callback({'columns': columns})

    @return_future
    def plot_columns(self, callback=None):
        plots = OrderedDict()
        for column in self.data.columns:
            plots[column] = escape.json_decode(self._plot_column(column))
        callback({'plots': plots})

    @return_future
    def get_data_table(self, params, callback=None):
        table_view = Table(self.data)
        table = escape.json_decode(
            table_view.paginate(
                params.get('start', 0), params.get('limit', 100)
            )
        )
        callback({'table': table})

    def _get_column_description(self, column):
        desc = escape.json_decode(
            self.data[column].describe(include='all').to_json()
        )
        dtype = self.data[column].dtype
        desc.update({
            'dtype': str(dtype),
            'num_undefined': int(
                self.data.shape[0] - self.data[column].count()
            )
        })

        if dtype in [np.float64, np.int64]:  # numeric dtype
            desc.update({
                'unique': len(self.data[column].unique()),
                'median': desc.pop('50%')
            })
        return desc

    def _plot_column(self, column):
        plot = None
        fig = None

        summary_plot = SummaryPlot(self.data[column])

        dtype = self.data[column].dtype
        if dtype in [np.float64, np.int64]:  # numeric dtype
            plot, fig = summary_plot.generate_boxplot()
        else:  # object, datetime e.t.c
            plot, fig = summary_plot.generate_barh()

        # cleanup memory
        summary_plot.destory_fig(fig)
        return plot
